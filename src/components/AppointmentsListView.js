import React, { useState, useEffect } from 'react';
import {
  Check,
  X,
  Clock,
  UserX,
  AlertCircle,
  FileText,
  Upload,
  Video,
} from 'lucide-react';
import { API_BASE, getAuthHeaders } from '../constants/api';
import AppointmentDetailModal from './AppointmentDetailModal';

const AppointmentsListView = () => {
  const [filter, setFilter] = useState('upcoming');
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  useEffect(() => {
    loadAppointments();
  }, [filter]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${API_BASE}/appointments/list?filter=${filter}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.success && data.appointments) {
        setAppointments(data.appointments);
      }
    } catch (err) {
      console.error('Failed to load appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (apt) => {
    const d = new Date(apt.appointmentDate);
    const time = apt.appointmentTime || '00:00';
    return `${d.toLocaleDateString()} at ${time}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'cancelled':
      case 'no-show':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {['upcoming', 'today', 'past'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 px-4 py-3 text-sm font-medium capitalize ${
              filter === f
                ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : appointments.length === 0 ? (
        <div className="py-16 text-center text-gray-500 dark:text-gray-400">
          No appointments found
        </div>
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {appointments.map((apt) => (
            <div
              key={apt._id}
              className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
              onClick={() => setSelectedAppointment(apt)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {apt.patientName}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(apt)} • {apt.appointmentType || 'Consultation'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {apt.reason}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                    apt.status
                  )}`}
                >
                  {apt.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      {selectedAppointment && (
        <AppointmentDetailModal
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onUpdated={loadAppointments}
        />
      )}
    </div>
  );
};

export default AppointmentsListView;
