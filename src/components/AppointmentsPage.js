import React, { useState } from 'react';
import { Calendar, List } from 'lucide-react';
import AppointmentsCalendar from './AppointmentsCalendar';
import AppointmentsListView from './AppointmentsListView';

const AppointmentsPage = () => {
  const [view, setView] = useState('calendar');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Appointments
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setView('calendar')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                view === 'calendar'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Calendar className="h-5 w-5" />
              Calendar
            </button>
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                view === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <List className="h-5 w-5" />
              List
            </button>
          </div>
        </div>
        {view === 'calendar' ? (
          <AppointmentsCalendar />
        ) : (
          <AppointmentsListView />
        )}
      </div>
    </div>
  );
};

export default AppointmentsPage;
