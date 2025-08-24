import React, { useState } from 'react';
import { api } from '../api.js';

export default function IssueForm({ issue, onDone, onCancel }) {
  const [title, setTitle] = useState(issue?.title || '');
  const [description, setDescription] = useState(issue?.description || '');
  const isEdit = !!issue;

  const save = async () => {
    const data = { title, description };
    try {
      if (isEdit) {
        const updated = await api.updateIssue(issue.id, data);
        onDone(updated);
      } else {
        const created = await api.createIssue(data);
        onDone(created);
      }
    } catch (e) {
      alert('Save failed: ' + e.message);
    }
  };

  // --- STYLE UPDATE ---
  // The entire return block has been updated with new Tailwind CSS classes
  // for a more modern and visually appealing design.
  return (
    <div className="p-4 sm:p-6 md:p-8 bg-white shadow-xl rounded-2xl max-w-2xl mx-auto">
      <h3 className="text-2xl font-bold text-gray-800 mb-6">
        {isEdit ? 'Edit Issue' : 'Create New Issue'}
      </h3>
      <div className="space-y-5">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            id="title"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
            placeholder="Enter a title for the issue"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            id="description"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
            placeholder="Describe the issue in detail"
            rows={8}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="flex gap-4 pt-2">
          <button
            onClick={save}
            className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 transition"
          >
            {isEdit ? 'Update Issue' : 'Create Issue'}
          </button>
          <button
            onClick={onCancel}
            type="button"
            className="px-5 py-2.5 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
