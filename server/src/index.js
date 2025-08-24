import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()
const app = express()
const PORT = process.env.PORT || 4000
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret'

app.use(helmet())
app.use(cors({ origin: true, credentials: true }))
app.use(express.json())
app.use(morgan('dev'))

// Simple /health
app.get('/health', (_req, res) => res.json({ ok: true }))

// Auth helpers
function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' })
}

function auth(required = true) {
  return (req, res, next) => {
    const header = req.headers.authorization
    if (!header) {
      if (required) return res.status(401).json({ error: 'Missing Authorization header' })
      else return next()
    }
    const [scheme, token] = header.split(' ')
    if (scheme !== 'Bearer' || !token) return res.status(401).json({ error: 'Invalid Authorization' })
    try {
      const payload = jwt.verify(token, JWT_SECRET)
      req.user = payload
      next()
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' })
    }
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role === role) return next()
    return res.status(403).json({ error: 'Forbidden' })
  }
}

// Validation schemas
const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1)
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
})

const issueCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1)
})

const issueUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  status: z.enum(['OPEN', 'CLOSED']).optional()
})

const commentCreateSchema = z.object({
  body: z.string().min(1)
})

// Auth routes
app.post('/auth/signup', async (req, res) => {
  const parsed = signupSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const { email, password, name } = parsed.data
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return res.status(409).json({ error: 'Email already registered' })
  const hash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({ data: { email, password: hash, name, role: 'USER' } })
  const token = signToken(user)
  res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } })
})

app.post('/auth/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const { email, password } = parsed.data
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })
  const ok = await bcrypt.compare(password, user.password)
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })
  const token = signToken(user)
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } })
})

// SSE connections per issue
const issueStreams = new Map() // issueId -> Set(res)

function broadcastIssueEvent(issueId, data) {
  const set = issueStreams.get(String(issueId))
  if (!set) return
  const payload = `data: ${JSON.stringify(data)}\n\n`
  for (const res of set) {
    res.write(payload)
  }
}

app.get('/issues/:id/stream', (req, res) => {
  const { id } = req.params
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()
  res.write('retry: 3000\n\n') // client reconnection hint
  const key = String(id)
  if (!issueStreams.has(key)) issueStreams.set(key, new Set())
  const set = issueStreams.get(key)
  set.add(res)
  req.on('close', () => {
    set.delete(res)
  })
})

// Issues CRUD with pagination & filtering
app.get('/issues', auth(false), async (req, res) => {
  const { status, page = '1', page_size = '10', q = '' } = req.query
  const where = {
    AND: [
      status ? { status: String(status).toUpperCase() } : {},
      q ? { OR: [{ title: { contains: String(q), mode: 'insensitive' } }, { description: { contains: String(q), mode: 'insensitive' } }] } : {}
    ]
  }
  const take = Math.min(100, Math.max(1, parseInt(page_size)))
  const skip = (Math.max(1, parseInt(page)) - 1) * take
  const [items, total] = await Promise.all([
    prisma.issue.findMany({
      where, skip, take,
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, status: true, createdAt: true, updatedAt: true, author: { select: { id: true, name: true } } }
    }),
    prisma.issue.count({ where })
  ])
  res.json({ items, total, page: parseInt(page), page_size: take })
})

app.post('/issues', auth(true), async (req, res) => {
  const parsed = issueCreateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const issue = await prisma.issue.create({
    data: { ...parsed.data, authorId: Number(req.user.sub) }
  })
  res.status(201).json(issue)
})

app.get('/issues/:id', auth(false), async (req, res) => {
  const id = parseInt(req.params.id)
  const issue = await prisma.issue.findUnique({
    where: { id },
    include: { author: { select: { id: true, name: true } }, comments: { include: { author: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } } }
  })
  if (!issue) return res.status(404).json({ error: 'Issue not found' })
  res.json(issue)
})

app.put('/issues/:id', auth(true), async (req, res) => {
  const id = parseInt(req.params.id)
  const parsed = issueUpdateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const issue = await prisma.issue.findUnique({ where: { id } })
  if (!issue) return res.status(404).json({ error: 'Issue not found' })
  const isOwner = issue.authorId === Number(req.user.sub)
  const isAdmin = req.user.role === 'ADMIN'
  if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Forbidden' })
  const updated = await prisma.issue.update({ where: { id }, data: parsed.data })
  res.json(updated)
})

app.patch('/issues/:id/close', auth(true), async (req, res) => {
  const id = parseInt(req.params.id)
  const issue = await prisma.issue.findUnique({ where: { id } })
  if (!issue) return res.status(404).json({ error: 'Issue not found' })
  const isOwner = issue.authorId === Number(req.user.sub)
  const isAdmin = req.user.role === 'ADMIN'
  if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Forbidden' })
  const updated = await prisma.issue.update({ where: { id }, data: { status: 'CLOSED' } })
  res.json(updated)
})

app.delete('/issues/:id', auth(true), async (req, res) => {
  const id = parseInt(req.params.id)
  const issue = await prisma.issue.findUnique({ where: { id } })
  if (!issue) return res.status(404).json({ error: 'Issue not found' })
  const isOwner = issue.authorId === Number(req.user.sub)
  const isAdmin = req.user.role === 'ADMIN'
  if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Forbidden' })
  await prisma.comment.deleteMany({ where: { issueId: id } })
  await prisma.issue.delete({ where: { id } })
  res.status(204).send()
})

// Comments
app.get('/issues/:id/comments', auth(false), async (req, res) => {
  const id = parseInt(req.params.id)
  const exists = await prisma.issue.findUnique({ where: { id } })
  if (!exists) return res.status(404).json({ error: 'Issue not found' })
  const comments = await prisma.comment.findMany({
    where: { issueId: id },
    include: { author: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' }
  })
  res.json(comments)
})

app.post('/issues/:id/comments', auth(true), async (req, res) => {
  const id = parseInt(req.params.id)
  const parsed = commentCreateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const issue = await prisma.issue.findUnique({ where: { id } })
  if (!issue) return res.status(404).json({ error: 'Issue not found' })
  const comment = await prisma.comment.create({
    data: { body: parsed.data.body, issueId: id, authorId: Number(req.user.sub) },
    include: { author: { select: { id: true, name: true } } }
  })
  // Broadcast SSE event
  broadcastIssueEvent(id, { type: 'comment.created', comment })
  res.status(201).json(comment)
})

// SSE and /health endpoints addition
// Health endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// In-memory storage for SSE clients per issue
if (!global.clients) {
  global.clients = {};
}

// SSE endpoint for notifications
app.get('/notifications/:issueId', (req, res) => {
  const { issueId } = req.params;
  // Set headers for SSE
  req.socket.setTimeout(0);
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  res.flushHeaders();

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  global.clients[issueId] = global.clients[issueId] || [];
  global.clients[issueId].push(newClient);

  req.on('close', () => {
    global.clients[issueId] = global.clients[issueId].filter(client => client.id !== clientId);
  });
});

// Endpoint to add a comment and notify clients
app.post('/issues/:issueId/comments', (req, res) => {
  const { issueId } = req.params;
  const comment = req.body.comment;
  // ...existing logic to store comment...

  const data = `data: ${JSON.stringify({ comment })}\n\n`;
  if (global.clients[issueId]) {
    global.clients[issueId].forEach(client => client.res.write(data));
  }

  res.status(201).json({ success: true, comment });
});

// Global error handler (fallback)
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal Server Error' })
})

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`)
})

// Replace CommonJS export with ES module export
export default app;