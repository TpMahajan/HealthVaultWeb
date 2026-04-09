import React, { useRef, useState } from 'react';
import { 
  X, 
  Calendar, 
  AlertCircle,
  CheckCircle,
  Loader
} from 'lucide-react';
import { API_BASE } from '../constants/api';
import {
  getCurrentDateInSelectedTimeZone,
  getSelectedTimeZone,
} from '../utils/timezone';

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
  const submitInFlightRef = useRef(false);

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
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (creating || submitInFlightRef.current) {
      console.log('⏳ Submission already in progress, ignoring duplicate click');
      return;
    }
    console.log('🚀 handleSubmit called - FORM SUBMISSION TRIGGERED!');
    console.log('📋 Form data:', formData);
    console.log('👤 Patient data:', patient);
    
    if (!formData.appointmentDate || !formData.appointmentTime || !formData.reason.trim()) {
      console.log('❌ Validation failed - missing required fields');
      setError('Please fill in all required fields');
      return;
    }
    
    console.log('✅ Validation passed, proceeding with submission');

    const todayInSelectedTimeZone = getCurrentDateInSelectedTimeZone();
    if (formData.appointmentDate < todayInSelectedTimeZone) {
      setError('Appointment date and time must be in the future');
      return;
    }
    if (formData.appointmentDate === todayInSelectedTimeZone) {
      const nowTimeInSelectedZone = new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: getSelectedTimeZone(),
      }).format(new Date());
      if (formData.appointmentTime <= nowTimeInSelectedZone) {
        setError('Appointment date and time must be in the future');
        return;
      }
    }

    submitInFlightRef.current = true;
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
      submitInFlightRef.current = false;
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
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-5">
      <div className="absolute inset-0 bg-[rgba(0,0,0,0.4)] backdrop-blur-[5px]" />
      <div className="relative z-[1000] w-[92%] max-w-[640px] max-h-[90vh] overflow-hidden bg-[#F8FAFC] dark:bg-[#1F1F1F] rounded-[16px] border border-gray-200 dark:border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.3)] animate-in fade-in zoom-in-95 duration-200 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-white/10 bg-[#F8FAFC] dark:bg-[#1F1F1F] flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="h-11 w-11 bg-primary/10 dark:bg-primary/20 rounded-full border border-primary/20 dark:border-primary/30 flex items-center justify-center text-primary font-bold text-base flex-shrink-0">
              {patient.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white truncate tracking-tight">
                Schedule Appointment
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {patient.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
          >
            <X className="h-5 w-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
          {/* Info Box */}
          <div className="p-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-[16px] shadow-sm">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-primary rounded-full"></div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Appointment will be saved to MongoDB database
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Appointment Date */}
            <div className="p-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-[16px] shadow-sm space-y-2">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Appointment Date *
              </label>
              <input
                type="date"
                name="appointmentDate"
                value={formData.appointmentDate}
                onChange={handleInputChange}
                min={getCurrentDateInSelectedTimeZone()}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-slate-700 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                required
              />
            </div>

            {/* Appointment Time */}
            <div className="p-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-[16px] shadow-sm space-y-2">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Appointment Time *
              </label>
              <select
                name="appointmentTime"
                value={formData.appointmentTime}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-slate-700 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                required
              >
                <option value="">Select time</option>
                {timeSlots.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Duration */}
            <div className="p-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-[16px] shadow-sm space-y-2">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Duration (minutes)
              </label>
              <select
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-slate-700 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
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
            <div className="p-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-[16px] shadow-sm space-y-2">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Appointment Type
              </label>
              <select
                name="appointmentType"
                value={formData.appointmentType}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-slate-700 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                <option value="consultation">Consultation</option>
                <option value="follow-up">Follow-up</option>
                <option value="emergency">Emergency</option>
                <option value="routine">Routine Checkup</option>
                <option value="specialist">Specialist Visit</option>
              </select>
            </div>
          </div>

          {/* Reason */}
          <div className="p-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-[16px] shadow-sm space-y-2">
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Reason for Visit *
            </label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleInputChange}
              placeholder="Describe the reason for this appointment..."
              rows={3}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-slate-700 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
              required
            />
          </div>

          {/* Notes */}
          <div className="p-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-[16px] shadow-sm space-y-2">
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Additional Notes (Optional)
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Any additional information or special requirements..."
              rows={2}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-slate-700 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
            />
          </div>

          {/* Error/Success Messages */}
          {(error || success) && (
            <div className={`p-3 rounded-xl flex items-center space-x-2 border ${
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

          {/* Actions - Inside Form */}
          <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-white/10 mt-4">
            <button
              type="submit"
              disabled={creating || !formData.appointmentDate || !formData.appointmentTime || !formData.reason.trim()}
              className="w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-primary to-teal-500 text-white text-sm font-bold rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-primary/20 active:scale-95"
            >
              {creating ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Create Appointment
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full px-6 py-3 border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-white/10 transition-all duration-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AppointmentModal;
