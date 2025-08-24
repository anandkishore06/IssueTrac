import React, { useEffect, useState } from 'react'
import { api, getToken } from '../api.js'

export default function IssueDetail({ issueId, onBack }) {
  const [issue, setIssue] = useState(null)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')

  async function load() {
    const data = await api.getIssue(issueId)
    setIssue(data)
    setComments(data.comments || [])
  }

  useEffect(() => {
    load()
    const stop = api.streamIssue(issueId, (evt) => {
      if (evt.type === 'comment.created') {
        setComments(prev => [...prev, evt.comment])
      }
    })
    return () => stop()
  }, [issueId])

  const add = async () => {
    const body = newComment.trim()
    if (!body) return
    setNewComment('')
    try {
      await api.addComment(issueId, { body })
    } catch (e) {
      setNewComment(body)
      alert('Failed to add comment: ' + e.message)
    }
  }

  const closeIssue = async () => {
    const prev = issue
    setIssue({ ...issue, status: 'CLOSED' })
    try {
      const updated = await api.closeIssue(issueId)
      setIssue(updated)
    } catch (e) {
      setIssue(prev)
      alert('Failed to close: ' + e.message)
    }
  }

  if (!issue) return <div className="text-center p-8">Loading...</div>

  // --- STYLE UPDATE ---
  // The entire return block has been updated with new Tailwind CSS classes
  // for a more modern and visually appealing design.
  return (
    <div className="p-4 sm:p-6 md:p-8 bg-white shadow-xl rounded-2xl max-w-3xl mx-auto">
      <button
        onClick={onBack}
        className="mb-6 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        Back to Issues
      </button>

      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
        <h3 className="text-3xl font-bold text-gray-800">
          {issue.title}
        </h3>
        <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase ${issue.status === 'OPEN'
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
          }`}>
          {issue.status}
        </span>
      </div>

      <div className="text-sm text-gray-500 mb-6 border-b pb-4">
        <span>Issue #{issue.id} opened by </span>
        <strong className="text-gray-700">{issue.author?.name}</strong>
      </div>

      <p className="mb-8 text-gray-700 leading-relaxed">{issue.description}</p>

      {issue.status === 'OPEN' && (
        <button
          onClick={closeIssue}
          className="mb-8 px-5 py-2.5 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75 transition"
        >
          Close Issue
        </button>
      )}

      <div className="border-t pt-6">
        <h4 className="text-xl font-semibold text-gray-800 mb-4">Comments ({comments.length})</h4>
        <ul className="space-y-4">
          {comments.map(c => (
            <li key={c.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-gray-800">
                  {c.author?.name}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(c.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-gray-700">{c.body}</p>
            </li>
          ))}
        </ul>

        {getToken() && (
          <div className="mt-6">
            <textarea
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
              placeholder="Write a comment..."
              rows="3"
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
            />
            <button
              onClick={add}
              className="mt-2 px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition"
            >
              Add Comment
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
