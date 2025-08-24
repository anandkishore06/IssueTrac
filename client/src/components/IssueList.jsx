import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import Swal from "sweetalert2";

// Accept the `user` object as a prop
export default function IssueList({ onSelect, onEdit, user }) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");

  const page_size = 10;

  async function load() {
    const data = await api.listIssues({ page, page_size, status, q });
    setItems(data.items);
    setTotal(data.total);
  }

  useEffect(() => {
    load();
  }, [page, status, q]);

  async function handleDelete(id) {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      await api.deleteIssue(id);
      Swal.fire("Deleted!", "The issue has been deleted.", "success");
      load();
    }
  }

  const totalPages = Math.ceil(total / page_size);

  return (
    <div className="p-4 max-w-5xl mx-auto">
      {/* Filter Section */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="p-2 border rounded-md"
        >
          <option value="">All</option>
          <option value="OPEN">Open</option>
          <option value="CLOSED">Closed</option>
        </select>
        <input
          placeholder="Search..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="p-2 border rounded-md flex-1"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto shadow-md rounded-lg">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Author</th>
              <th className="px-4 py-2">Created</th>
              <th className="px-4 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              // --- FIX ---
              // Determine if the current user has permission to modify this issue
              const canModify = user && (user.role === 'admin' || user.id === it.author?.id);
              return (
                <tr key={it.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2">{it.id}</td>
                  <td
                    className="px-4 py-2 text-blue-600 cursor-pointer hover:underline"
                    onClick={() => onSelect(it)}
                  >
                    {it.title}
                  </td>
                  <td className="px-4 py-2">{it.status}</td>
                  <td className="px-4 py-2">{it.author?.name}</td>
                  <td className="px-4 py-2">
                    {new Date(it.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 flex gap-2 justify-center">
                    <button
                      onClick={() => onEdit(it)}
                      // --- FIX ---
                      // Disable the button and change styling based on permission
                      disabled={!canModify}
                      className={`px-3 py-1 rounded ${canModify
                          ? 'bg-blue-500 text-white hover:bg-blue-600'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(it.id)}
                      disabled={!canModify}
                      className={`px-3 py-1 rounded ${canModify
                          ? 'bg-red-500 text-white hover:bg-red-600'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4">
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Prev
        </button>
        <span className="text-gray-600">
          Page {page} / {totalPages || 1}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="px-3 py-1 border rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
