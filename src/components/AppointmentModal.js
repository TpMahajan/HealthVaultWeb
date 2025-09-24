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
import { API_BASE } from '../constants/api';

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
    console.log(`📝 Input changed: ${name} = ${value}`);
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: value
      };
      console.log('📝 Updated form data:', newData);
      return newData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🚀 handleSubmit called - FORM SUBMISSION TRIGGERED!');
    console.log('📋 Form data:', formData);
    console.log('👤 Patient data:', patient);
    
    if (!formData.appointmentDate || !formData.appointmentTime || !formData.reason.trim()) {
      console.log('❌ Validation failed - missing required fields');
      setError('Please fill in all required fields');
      return;
    }
    
    console.log('✅ Validation passed, proceeding with submission');

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
        patientId: patient.id || patient.patientId,
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

      // Debug logging
      console.log('🔍 AppointmentModal Debug:');
      console.log('Patient object:', patient);
      console.log('Patient ID:', patient.id || patient.patientId);
      console.log('Appointment data:', appointmentData);
      console.log('Auth token present:', token ? 'Yes' : 'No');

      // Use API_BASE constant for consistent endpoint
      const appointmentsUrl = `${API_BASE}/appointments`;
      console.log(`🚀 Creating appointment at: ${appointmentsUrl}`);
      console.log('📤 Request payload:', JSON.stringify(appointmentData, null, 2));
      
      const response = await fetch(appointmentsUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(appointmentData)
      });
      
      console.log(`📥 Response from backend:`, {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
        url: response.url,
        contentType: response.headers.get('content-type')
      });

      // Check response status first
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HTTP Error Response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        if (response.status === 401) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else if (response.status === 400) {
          errorMessage = 'Invalid data provided. Please check all fields.';
        } else if (response.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        }
        
        throw new Error(errorMessage);
      }

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('❌ Non-JSON response:', text);
        throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}. This usually means the backend server is not running or the endpoint doesn't exist.`);
      }

      const data = await response.json();
      console.log('📋 Parsed response data:', data);

      if (data.success) {
        console.log('✅ Appointment created successfully:', data.appointment);
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
        console.error('❌ Backend returned success: false:', data);
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
                {patient.name} • {patient.id || patient.patientId}
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
              type="button"
              onClick={async () => {
                console.log('🧪 TEST BUTTON CLICKED - Direct API call');
                const token = localStorage.getItem('token');
                if (!token) {
                  console.error('❌ No token found');
                  return;
                }
                
                const testData = {
                  patientId: patient.id || patient.patientId,
                  patientName: patient.name,
                  patientEmail: patient.email || '',
                  patientPhone: patient.mobile || '',
                  appointmentDate: '2025-01-20',
                  appointmentTime: '14:30',
                  duration: 30,
                  reason: 'Test appointment',
                  appointmentType: 'consultation',
                  notes: 'Test notes'
                };
                
                console.log('🧪 Test data:', testData);
                
                try {
                  const response = await fetch(`${API_BASE}/appointments`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(testData)
                  });
                  
                  console.log('🧪 Test response status:', response.status);
                  const responseText = await response.text();
                  console.log('🧪 Test response body:', responseText);
                  
                  if (response.ok) {
                    const data = JSON.parse(responseText);
                    console.log('🧪 Test SUCCESS:', data);
                    if (onAppointmentCreated) {
                      onAppointmentCreated(data.appointment);
                    }
                  } else {
                    console.error('🧪 Test FAILED:', response.status, responseText);
                  }
                } catch (error) {
                  console.error('🧪 Test ERROR:', error);
                }
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 mr-2"
            >
              🧪 TEST API
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
