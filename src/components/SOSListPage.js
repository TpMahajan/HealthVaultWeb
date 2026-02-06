import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../constants/api';
import AdminLayout from './AdminLayout';

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

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-8 flex items-center justify-center">
          <div className="text-gray-600">Loading...</div>
        </div>
      </AdminLayout>
    );
  }
  
  if (error) {
    return (
      <AdminLayout>
        <div className="p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
        </div>
      </AdminLayout>
    );
  }

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
    <AdminLayout>
      <div className="p-4 md:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#263238] mb-2">SOS Messages (FIFO)</h1>
          <p className="text-gray-600">Emergency messages from patients requiring immediate attention</p>
        </div>
        
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Allergies</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                      No SOS messages found
                    </td>
                  </tr>
                ) : (
                  items.map((it) => (
                    <tr key={it._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(it.createdAt).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{it.name || '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{it.age || '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{it.mobile || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-[14rem] truncate">{it.location || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-[12rem] truncate">{it.allergiesSnapshot || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-[16rem] truncate">{it.notes || '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleForward(it._id)}
                            className="px-3 py-1 rounded-md text-sm bg-green-100 text-green-700 hover:bg-green-200 inline-flex items-center gap-1 transition-colors"
                            title="Send forward"
                          >
                            <span>Forward</span>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                              <path d="M13.5 4.5a.75.75 0 0 1 1.06 0l6 6a.75.75 0 0 1 0 1.06l-6 6a.75.75 0 0 1-1.06-1.06L18.44 12l-4.94-4.94a.75.75 0 0 1 0-1.06Z" />
                              <path d="M3.75 12a.75.75 0 0 1 .75-.75h12a.75.75 0 0 1 0 1.5h-12A.75.75 0 0 1 3.75 12Z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleClear(it._id)}
                            className="px-3 py-1 rounded-md text-sm bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                            title="Clear from queue"
                          >
                            Clear
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SOSListPage;


