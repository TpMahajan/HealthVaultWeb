import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../constants/api';
import AdminLayout from './AdminLayout';
import { CheckCircle, XCircle, Clock, Search } from 'lucide-react';

const AdminLostReportsPage = () => {
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('suggested'); // suggested, confirmed, rejected

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      // Fetch summary
      const summaryRes = await fetch(`${API_BASE}/admin/lost-found/summary`, { headers });
      const summaryData = await summaryRes.json();
      if (summaryData?.success) {
        setSummary(summaryData.summary);
      }

      // Fetch matches
      const matchesRes = await fetch(`${API_BASE}/admin/lost-found/matches?status=${filter}`, { headers });
      const matchesData = await matchesRes.json();
      if (matchesData?.success && Array.isArray(matchesData.data?.matches)) {
        setMatches(matchesData.data.matches);
      } else {
        setError(matchesData.message || 'Failed to load matches');
      }
    } catch (e) {
      setError('Network error');
      console.error('Error fetching lost reports:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (matchId) => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_BASE}/admin/lost-found/matches/${matchId}/confirm`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        fetchData(); // Refresh data
      } else {
        alert(data.message || 'Failed to confirm match');
      }
    } catch (e) {
      alert('Network error');
    }
  };

  const handleReject = async (matchId) => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_BASE}/admin/lost-found/matches/${matchId}/reject`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        fetchData(); // Refresh data
      } else {
        alert(data.message || 'Failed to reject match');
      }
    } catch (e) {
      alert('Network error');
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-8 flex items-center justify-center">
          <div className="text-gray-600">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#263238] mb-2">Lost & Found Reports</h1>
          <p className="text-gray-600">Review and manage lost person reports and matches</p>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Search className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Open Lost Reports</p>
                  <p className="text-2xl font-bold text-[#263238]">{summary.openLostCount || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Clock className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Unmatched Found</p>
                  <p className="text-2xl font-bold text-[#263238]">{summary.unmatchedFoundCount || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Suggested Matches</p>
                  <p className="text-2xl font-bold text-[#263238]">{summary.suggestedMatchesCount || 0}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2 border-b border-gray-200">
          {['suggested', 'confirmed', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 font-medium text-sm transition-colors ${
                filter === status
                  ? 'text-sky-600 border-b-2 border-sky-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Matches List */}
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          {matches.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Search className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No {filter} matches found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lost Report
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Found Report
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Match Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {matches.map((match) => (
                    <tr key={match._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {match.lostReportId?.personName || 'N/A'}
                          </div>
                          <div className="text-gray-500">
                            Age: {match.lostReportId?.approxAge || 'N/A'} | {match.lostReportId?.gender || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            Last seen: {match.lostReportId?.lastSeenLocation || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            Found Person
                          </div>
                          <div className="text-gray-500">
                            Age: {match.foundReportId?.approxAge || 'N/A'} | {match.foundReportId?.gender || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            Location: {match.foundReportId?.currentLocation || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {match.score ? `${(match.score * 100).toFixed(1)}%` : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          match.status === 'confirmed' 
                            ? 'bg-green-100 text-green-800'
                            : match.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {match.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {match.status === 'suggested' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleConfirm(match._id)}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                            >
                              <CheckCircle className="h-4 w-4" />
                              Confirm
                            </button>
                            <button
                              onClick={() => handleReject(match._id)}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                            >
                              <XCircle className="h-4 w-4" />
                              Reject
                            </button>
                          </div>
                        )}
                        {match.status === 'confirmed' && (
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            Confirmed
                          </span>
                        )}
                        {match.status === 'rejected' && (
                          <span className="text-red-600 flex items-center gap-1">
                            <XCircle className="h-4 w-4" />
                            Rejected
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminLostReportsPage;


