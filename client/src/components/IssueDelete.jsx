import React from 'react';

export default function DeleteIssueButton({ issueId, token, onDeleted }) {
    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to delete this issue?")) return;

        try {
            const res = await fetch(`http://localhost:4000/issues/${issueId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (res.status === 204) {
                alert("Issue deleted");
                if (onDeleted) onDeleted(issueId);
            } else {
                const err = await res.json();
                alert("Error: " + err.error);
            }
        } catch (e) {
            alert("Network error: " + e.message);
        }
    };

    return (
        <button
            onClick={handleDelete}
            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
        >
            Delete
        </button>
    );
}
