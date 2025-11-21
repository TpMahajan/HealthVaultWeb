import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../constants/api';

const SOSListPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const res = await fetch(`${API_BASE}/sos`, token ? { headers: { 'Authorization': `Bearer ${token}` } } : undefined);
        const data = await res.json();
        if (data.success) {
          const list = Array.isArray(data.data) ? data.data : [];
          setItems(list);
          // Mark as read
          const ids = list.filter(x => !x.isRead).map(x => x._id);
          if (ids.length) {
            await fetch(`${API_BASE}/sos/mark-read`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ids })
            });
          }
        } else setError(data.message || 'Failed to load');
      } catch (e) {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [navigate]);

  if (loading) return <div className="p-6 text-gray-800 dark:text-gray-200">Loading...</div>;
  if (error) return <div className="p-6 text-red-600 dark:text-red-400">{error}</div>;

  const handleClear = async (id) => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_BASE}/sos/${id}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
      });
      const data = await res.json();
      if (data.success) {
        setItems((prev) => prev.filter((x) => x._id !== id));
      } else {
        alert(data.message || 'Failed to clear');
      }
    } catch (e) {
      alert('Network error');
    }
  };

  const handleForward = (id) => {
    // Placeholder for forward action
    alert('Sent forward');
  };

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-5xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">SOS Messages (FIFO)</h1>
          <button onClick={() => { localStorage.removeItem('adminToken'); window.location.reload(); }} className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300">Clear Admin Session</button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr className="text-left border-b border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                <th className="py-2 pr-4 font-semibold">Time</th>
                <th className="py-2 pr-4 font-semibold">Name</th>
                <th className="py-2 pr-4 font-semibold">Age</th>
                <th className="py-2 pr-4 font-semibold">Mobile</th>
                <th className="py-2 pr-4 font-semibold">Location</th>
                <th className="py-2 pr-4 font-semibold">Allergies</th>
                <th className="py-2 pr-4 font-semibold">Notes</th>
                <th className="py-2 pr-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-800 dark:text-gray-200">
              {items.map((it) => (
                <tr key={it._id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="py-2 pr-4 whitespace-nowrap">{new Date(it.createdAt).toLocaleString()}</td>
                  <td className="py-2 pr-4">{it.name || ''}</td>
                  <td className="py-2 pr-4">{it.age || ''}</td>
                  <td className="py-2 pr-4">{it.mobile || ''}</td>
                  <td className="py-2 pr-4 truncate max-w-[14rem]">{it.location || ''}</td>
                  <td className="py-2 pr-4 truncate max-w-[12rem]">{it.allergiesSnapshot || '—'}</td>
                  <td className="py-2 pr-4 truncate max-w-[16rem]">{it.notes || '—'}</td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleForward(it._id)}
                        className="px-3 py-1 rounded-md text-sm bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50 inline-flex items-center gap-1"
                        title="Send forward"
                      >
                        <span>Send forward</span>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                          <path d="M13.5 4.5a.75.75 0 0 1 1.06 0l6 6a.75.75 0 0 1 0 1.06l-6 6a.75.75 0 0 1-1.06-1.06L18.44 12l-4.94-4.94a.75.75 0 0 1 0-1.06Z" />
                          <path d="M3.75 12a.75.75 0 0 1 .75-.75h12a.75.75 0 0 1 0 1.5h-12A.75.75 0 0 1 3.75 12Z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleClear(it._id)}
                        className="px-3 py-1 rounded-md text-sm bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
                        title="Clear from queue"
                      >
                        Clear
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SOSListPage;


