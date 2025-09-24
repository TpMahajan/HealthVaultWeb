import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, FileText, Save, Loader } from 'lucide-react';

const AppointmentForm = ({ isOpen, onClose, onSuccess, patient = null }) => {
  const [formData, setFormData] = useState({
    patientId: patient?.patientId || patient?.id || '',
    patientName: patient?.name || '',
    patientEmail: patient?.email || '',
    patientPhone: patient?.mobile || patient?.phone || '',
    appointmentDate: '',
    appointmentTime: '',
    reason: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Update form data when patient prop changes
  useEffect(() => {
    if (patient) {
      setFormData(prev => ({
        ...prev,
        patientId: patient.patientId || patient.id || '',
        patientName: patient.name || '',
        patientEmail: patient.email || '',
        patientPhone: patient.mobile || patient.phone || ''
      }));
    }
  }, [patient]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      
      // Validate required fields
      if (!formData.patientName || !formData.appointmentDate || !formData.appointmentTime || !formData.reason) {
        setError('Please fill in all required fields.');
        setLoading(false);
        return;
      }

      // Prepare appointment data with required fields
      const appointmentData = {
        patientId: formData.patientId || 'unknown', // Will be set by parent component
        patientName: formData.patientName,
        patientEmail: formData.patientEmail || '',
        patientPhone: formData.patientPhone || '',
        appointmentDate: formData.appointmentDate,
        appointmentTime: formData.appointmentTime,
        duration: 30,
        reason: formData.reason,
        appointmentType: 'consultation',
        notes: formData.notes
      };

      const response = await fetch('https://healthvault-backend-c6xl.onrender.com/api/appointments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(appointmentData),
      });

      const data = await response.json();
      console.log('Appointment creation response:', data);

      if (data.success) {
        // Reset form
        setFormData({
          patientId: patient?.patientId || patient?.id || '',
          patientName: patient?.name || '',
          patientEmail: patient?.email || '',
          patientPhone: patient?.mobile || patient?.phone || '',
          appointmentDate: '',
          appointmentTime: '',
          reason: '',
          notes: ''
        });
        
        // Close modal and notify parent
        onClose();
        if (onSuccess) onSuccess(data.appointment);
        
        // Show success message
        alert('Appointment created successfully!');
      } else {
        setError(data.message || 'Failed to create appointment.');
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      setError('Error creating appointment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        patientId: patient?.patientId || patient?.id || '',
        patientName: patient?.name || '',
        patientEmail: patient?.email || '',
        patientPhone: patient?.mobile || patient?.phone || '',
        appointmentDate: '',
        appointmentTime: '',
        reason: '',
        notes: ''
      });
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Schedule New Appointment</h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200 disabled:opacity-50"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Patient Info Display */}
          {patient && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {patient.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-blue-900">{patient.name}</h3>
                  <p className="text-xs text-blue-700">ID: {patient.patientId || patient.id}</p>
                  {patient.email && <p className="text-xs text-blue-700">{patient.email}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Patient Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="h-4 w-4 inline mr-2" />
              Patient Name *
            </label>
            <input
              type="text"
              value={formData.patientName}
              onChange={(e) => handleInputChange('patientName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter patient's full name"
              required
              disabled={loading}
            />
          </div>

          {/* Appointment Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-2" />
              Appointment Date *
            </label>
            <input
              type="date"
              value={formData.appointmentDate}
              onChange={(e) => handleInputChange('appointmentDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min={new Date().toISOString().split('T')[0]}
              required
              disabled={loading}
            />
          </div>

          {/* Appointment Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="h-4 w-4 inline mr-2" />
              Appointment Time *
            </label>
            <input
              type="time"
              value={formData.appointmentTime}
              onChange={(e) => handleInputChange('appointmentTime', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={loading}
            />
          </div>

          {/* Reason for Visit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="h-4 w-4 inline mr-2" />
              Reason for Visit *
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => handleInputChange('reason', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe the patient's symptoms or reason for the appointment"
              required
              disabled={loading}
            />
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Any additional notes or special requirements"
              disabled={loading}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Appointment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AppointmentForm;

