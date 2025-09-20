import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  User, 
  AlertCircle,
  CheckCircle,
  Loader
} from 'lucide-react';

const AppointmentModal = ({ isOpen, onClose, patient, onAppointmentCreated }) => {
  const [formData, setFormData] = useState({
    appointmentDate: '',
    appointmentTime: '',
    duration: 30,
    reason: '',
    appointmentType: 'consultation',
    notes: ''
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.appointmentDate || !formData.appointmentTime || !formData.reason.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    // Check if appointment date is in the past
    const appointmentDateTime = new Date(`${formData.appointmentDate}T${formData.appointmentTime}`);
    if (appointmentDateTime < new Date()) {
      setError('Appointment date and time must be in the future');
      return;
    }

    setCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Please login first');
      }

      const appointmentData = {
        patientId: patient.patientId,
        patientName: patient.name,
        patientEmail: patient.email || '',
        patientPhone: patient.mobile || '',
        appointmentDate: formData.appointmentDate,
        appointmentTime: formData.appointmentTime,
        duration: parseInt(formData.duration),
        reason: formData.reason,
        appointmentType: formData.appointmentType,
        notes: formData.notes
      };

      // Try hosted backend first, then fallback to localhost
      const baseUrls = [
        'https://healthvault-backend-c6xl.onrender.com',
        'http://localhost:5000'
      ];
      
      let response;
      let lastError;
      
      for (const baseUrl of baseUrls) {
        try {
          console.log(`Attempting to connect to: ${baseUrl}/api/appointments`);
          response = await fetch(`${baseUrl}/api/appointments`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(appointmentData)
          });
          
          console.log(`Response from ${baseUrl}:`, {
            status: response.status,
            statusText: response.statusText,
            contentType: response.headers.get('content-type')
          });
          
          // If we get a response (even if error), break the loop
          break;
        } catch (err) {
          lastError = err;
          console.log(`Failed to connect to ${baseUrl}:`, err.message);
          continue;
        }
      }
      
      if (!response) {
        throw lastError || new Error('Unable to connect to backend server');
      }

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}. This usually means the backend server is not running or the endpoint doesn't exist.`);
      }

      const data = await response.json();

      if (data.success) {
        setSuccess('✅ Appointment created and saved to MongoDB successfully!');
        setFormData({
          appointmentDate: '',
          appointmentTime: '',
          duration: 30,
          reason: '',
          appointmentType: 'consultation',
          notes: ''
        });
        
        // Call success callback
        if (onAppointmentCreated) {
          onAppointmentCreated(data.appointment);
        }
        
        // Close modal after 3 seconds
        setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        setError(data.message || 'Failed to create appointment');
      }
    } catch (err) {
      setError(err.message || 'Failed to create appointment');
    } finally {
      setCreating(false);
    }
  };

  // Generate time slots
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[95vh] flex flex-col mx-2 sm:mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm sm:text-lg flex-shrink-0">
              {patient.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 truncate">
                Schedule Appointment
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                {patient.name} • {patient.patientId}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1 hidden sm:block">
                📅 Appointment will be saved to MongoDB database
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Info Box */}
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-4">
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-800 dark:text-green-200 font-medium">
                Appointment will be saved to MongoDB database
              </span>
            </div>
          </div>
          {/* Appointment Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Appointment Date *
            </label>
            <input
              type="date"
              name="appointmentDate"
              value={formData.appointmentDate}
              onChange={handleInputChange}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Appointment Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Appointment Time *
            </label>
            <select
              name="appointmentTime"
              value={formData.appointmentTime}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select time</option>
              {timeSlots.map(time => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Duration (minutes)
            </label>
            <select
              name="duration"
              value={formData.duration}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
              <option value={90}>90 minutes</option>
              <option value={120}>120 minutes</option>
            </select>
          </div>

          {/* Appointment Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Appointment Type
            </label>
            <select
              name="appointmentType"
              value={formData.appointmentType}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="consultation">Consultation</option>
              <option value="follow-up">Follow-up</option>
              <option value="emergency">Emergency</option>
              <option value="routine">Routine Checkup</option>
              <option value="specialist">Specialist Visit</option>
            </select>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reason for Visit *
            </label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleInputChange}
              placeholder="Describe the reason for this appointment..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Any additional information or special requirements..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Error/Success Messages */}
          {(error || success) && (
            <div className={`p-3 rounded-lg flex items-center space-x-2 ${
              error 
                ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800' 
                : 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800'
            }`}>
              {error ? (
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              )}
              <span className={`text-sm ${
                error 
                  ? 'text-red-800 dark:text-red-200' 
                  : 'text-green-800 dark:text-green-200'
              }`}>
                {error || success}
              </span>
            </div>
          )}

        </form>

        {/* Actions - Sticky Footer */}
        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 p-4 sm:p-6 pt-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !formData.appointmentDate || !formData.appointmentTime || !formData.reason.trim()}
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white text-sm font-semibold rounded-xl hover:from-green-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              {creating ? (
                <>
                  <Loader className="h-5 w-5 mr-2 animate-spin" />
                  Saving to Database...
                </>
              ) : (
                <>
                  <Calendar className="h-5 w-5 mr-2" />
                  Create & Save Appointment
                </>
              )}
            </button>
        </div>
      </div>
    </div>
  );
};

export default AppointmentModal;
