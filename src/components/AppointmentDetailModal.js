import React, { useState } from 'react';
import {
  X,
  Check,
  XCircle,
  Clock,
  UserX,
  AlertCircle,
  FileText,
  Upload,
  Loader,
} from 'lucide-react';
import { API_BASE, getAuthHeaders, getAuthHeadersMultipart } from '../constants/api';

const AppointmentDetailModal = ({ appointment, onClose, onUpdated }) => {
  const [doctorNotesPrivate, setDoctorNotesPrivate] = useState(
    appointment?.doctorNotesPrivate || ''
  );
  const [doctorNotesShared, setDoctorNotesShared] = useState(
    appointment?.doctorNotesShared || ''
  );
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  if (!appointment) return null;

  const formatDate = () => {
    const d = new Date(appointment.appointmentDate);
    const time = appointment.appointmentTime || '00:00';
    return `${d.toLocaleDateString()} at ${time}`;
  };

  const callApi = async (method, url, body = null) => {
    const token = localStorage.getItem('token');
    const opts = {
      method,
      headers: { Authorization: `Bearer ${token}` },
    };
    if (body && method !== 'GET') {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(url, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  };

  const handleAccept = async () => {
    try {
      setLoading(true);
      setError(null);
      await callApi('PUT', `${API_BASE}/appointments/${appointment._id}/accept`);
      onUpdated?.();
      onClose?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      setLoading(true);
      setError(null);
      await callApi('PUT', `${API_BASE}/appointments/${appointment._id}/reject`);
      onUpdated?.();
      onClose?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    try {
      setLoading(true);
      setError(null);
      await callApi('PUT', `${API_BASE}/appointments/${appointment._id}/complete`);
      onUpdated?.();
      onClose?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNoShow = async () => {
    try {
      setLoading(true);
      setError(null);
      await callApi('PUT', `${API_BASE}/appointments/${appointment._id}/no-show`);
      onUpdated?.();
      onClose?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRunningLate = async () => {
    const minutes = prompt('How many minutes late?', '15');
    if (minutes == null) return;
    try {
      setLoading(true);
      setError(null);
      await callApi('PUT', `${API_BASE}/appointments/${appointment._id}/running-late`, {
        minutes: parseInt(minutes) || 15,
      });
      onUpdated?.();
      onClose?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    try {
      setLoading(true);
      setError(null);
      await callApi('PUT', `${API_BASE}/appointments/${appointment._id}/notes`, {
        doctorNotesPrivate,
        doctorNotesShared,
      });
      onUpdated?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadPrescription = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      setError(null);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name);
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${API_BASE}/appointments/${appointment._id}/upload-prescription`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');
      onUpdated?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleUploadReport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      setError(null);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name);
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${API_BASE}/appointments/${appointment._id}/upload-report`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');
      onUpdated?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const isPending = appointment.status === 'pending';
  const isUpcoming = ['scheduled', 'confirmed'].includes(appointment.status);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Appointment Details
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-300">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              {error}
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {appointment.patientName}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {appointment.patientEmail} • {appointment.patientPhone}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {formatDate()} • {appointment.appointmentType || 'Consultation'}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              <strong>Reason:</strong> {appointment.reason}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Mode: {appointment.mode || 'in-person'}
            </p>
          </div>
          {isPending && (
            <div className="flex gap-2">
              <button
                onClick={handleAccept}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? <Loader className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Accept
              </button>
              <button
                onClick={handleReject}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                Reject
              </button>
            </div>
          )}
          {isUpcoming && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleComplete}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? <Loader className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Mark Completed
              </button>
              <button
                onClick={handleNoShow}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                <UserX className="h-4 w-4" />
                No-show
              </button>
              <button
                onClick={handleRunningLate}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
              >
                <Clock className="h-4 w-4" />
                Running Late
              </button>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Private Notes (doctor only)
            </label>
            <textarea
              value={doctorNotesPrivate}
              onChange={(e) => setDoctorNotesPrivate(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Shared Notes (patient-visible)
            </label>
            <textarea
              value={doctorNotesShared}
              onChange={(e) => setDoctorNotesShared(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <button
              onClick={handleSaveNotes}
              disabled={loading}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Save Notes
            </button>
          </div>
          {isUpcoming && (
            <div className="flex gap-2">
              <label className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer disabled:opacity-50">
                <Upload className="h-4 w-4" />
                {uploading ? 'Uploading...' : 'Upload Prescription'}
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleUploadPrescription}
                  disabled={uploading}
                />
              </label>
              <label className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 cursor-pointer disabled:opacity-50">
                <FileText className="h-4 w-4" />
                {uploading ? 'Uploading...' : 'Upload Report'}
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleUploadReport}
                  disabled={uploading}
                />
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppointmentDetailModal;
