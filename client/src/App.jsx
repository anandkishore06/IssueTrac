import React, { useEffect, useState } from 'react';
import IssueList from './components/IssueList.jsx';
import IssueDetail from './components/IssueDetail.jsx';
import IssueForm from './components/IssueForm.jsx';
import Login from './components/Login.jsx';
import Signup from './components/Signup.jsx';
import { api, setToken, getToken } from './api.js';

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('list');
  const [selectedIssue, setSelectedIssue] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      setToken(token);
      setUser(JSON.parse(storedUser));
      const savedView = localStorage.getItem('view');
      const savedIssue = localStorage.getItem('selectedIssue');
      if (savedView) setView(savedView);
      if (savedIssue) setSelectedIssue(JSON.parse(savedIssue));
    }
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('view', view);
      if (selectedIssue) {
        localStorage.setItem('selectedIssue', JSON.stringify(selectedIssue));
      } else {
        localStorage.removeItem('selectedIssue');
      }
    }
  }, [view, selectedIssue, user]);

  const onLoggedIn = (data) => {
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('view');
    localStorage.removeItem('selectedIssue');
    setToken(null);
    setUser(null);
    setView('list');
  };

  return (
    <div className="font-sans max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
      <header className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-blue-600">Issue Tracker</h2>
        <div>
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-gray-700">
                Hi <strong>{user.name}</strong> ({user.role})
              </span>
              <button
                onClick={logout}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </header>

      {!user ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Login onLoggedIn={onLoggedIn} />
          <Signup onLoggedIn={onLoggedIn} />
        </div>
      ) : view === 'list' ? (
        <>
          <div className="flex justify-between mb-4">
            <button
              onClick={() => {
                setSelectedIssue(null);
                setView('new');
              }}
              className="px-4 py-2 bg-green-500 text-white rounded-lg shadow hover:bg-green-600 transition"
            >
              + New Issue
            </button>
          </div>
          <IssueList
            // --- FIX ---
            // Pass the current user object as a prop
            user={user}
            onSelect={(issue) => {
              setSelectedIssue(issue);
              setView('detail');
            }}
            onEdit={(issue) => {
              setSelectedIssue(issue);
              setView('edit');
            }}
          />
        </>
      ) : view === 'detail' && selectedIssue ? (
        <IssueDetail issueId={selectedIssue.id} onBack={() => setView('list')} />
      ) : view === 'new' || view === 'edit' ? (
        <IssueForm
          issue={view === 'edit' ? selectedIssue : null}
          onDone={(issue) => {
            setSelectedIssue(issue);
            setView('detail');
          }}
          onCancel={() => setView('list')}
        />
      ) : null}
    </div>
  );
}
