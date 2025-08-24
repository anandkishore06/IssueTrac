import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
const prisma = new PrismaClient()

async function main() {
  const adminPass = await bcrypt.hash('admin123', 10)
  const userPass = await bcrypt.hash('user1234', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: { email: 'admin@example.com', password: adminPass, name: 'Admin', role: 'ADMIN' }
  })

  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: { email: 'user@example.com', password: userPass, name: 'Alice', role: 'USER' }
  })

  const issue1 = await prisma.issue.create({
    data: { title: 'First issue', description: 'This is a demo issue.', authorId: user.id }
  })

  await prisma.comment.createMany({
    data: [
      { body: 'Initial comment', issueId: issue1.id, authorId: user.id },
      { body: 'Admin note', issueId: issue1.id, authorId: admin.id }
    ]
  })

  console.log('Seed completed.')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
