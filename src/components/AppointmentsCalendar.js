import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { API_BASE } from '../constants/api';
import AppointmentDetailModal from './AppointmentDetailModal';

const AppointmentsCalendar = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  useEffect(() => {
    loadCalendarData();
  }, [currentDate]);

  const loadCalendarData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const dateStr = currentDate.toISOString().split('T')[0];
      const res = await fetch(
        `${API_BASE}/appointments/calendar?view=month&date=${dateStr}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.success && data.appointments) {
        setAppointments(data.appointments);
      }
    } catch (err) {
      console.error('Failed to load calendar:', err);
    } finally {
      setLoading(false);
    }
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={prevMonth}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {monthName}
        </h2>
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : appointments.length === 0 ? (
        <div className="py-16 text-center text-gray-500 dark:text-gray-400">
          No appointments this month
        </div>
      ) : (
        <div className="p-4 space-y-2 max-h-[500px] overflow-y-auto">
          {appointments.map((apt) => {
            const d = new Date(apt.appointmentDate);
            const time = apt.appointmentTime || '00:00';
            return (
              <div
                key={apt._id}
                onClick={() => setSelectedAppointment(apt)}
                className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {apt.patientName}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {d.toLocaleDateString()} at {time} • {apt.appointmentType || 'Consultation'}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      apt.status === 'completed'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : apt.status === 'cancelled'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                    }`}
                  >
                    {apt.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {selectedAppointment && (
        <AppointmentDetailModal
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onUpdated={loadCalendarData}
        />
      )}
    </div>
  );
};

export default AppointmentsCalendar;
