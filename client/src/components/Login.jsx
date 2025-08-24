import React, { useState } from 'react'
import { api } from '../api.js'

export default function Login({ onLoggedIn }) {
  const [email, setEmail] = useState('user@example.com')
  const [password, setPassword] = useState('user1234')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await api.login({ email, password })
      onLoggedIn(data)
    } catch (e) {
      alert('Login failed: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="max-w-sm mx-auto bg-white p-6 rounded-2xl shadow-md space-y-4"
    >
      <h3 className="text-2xl font-semibold text-gray-800 text-center">Login</h3>

      <input
        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />

      <input
        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
        placeholder="Password"
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />

      <button
        disabled={loading}
        type="submit"
        className={`w-full py-3 rounded-md text-white font-medium transition 
          ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
      >
        {loading ? 'Loading...' : 'Login'}
      </button>
    </form>
  )
}
