import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Camera, CheckCircle, AlertCircle, Loader } from 'lucide-react';

const QRScanner = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Simulated QR codes for demo
  const demoQRCodes = [
    { id: 'PAT001', name: 'John Doe', age: 45, lastVisit: '2024-01-15' },
    { id: 'PAT002', name: 'Jane Smith', age: 32, lastVisit: '2024-01-10' },
    { id: 'PAT003', name: 'Mike Johnson', age: 58, lastVisit: '2024-01-08' },
  ];

  const startScan = () => {
    setIsScanning(true);
    setScanResult(null);
    setError(null);
    
    // Simulate camera activation
    setTimeout(() => {
      // Simulate QR code detection
      const randomQR = demoQRCodes[Math.floor(Math.random() * demoQRCodes.length)];
      setScanResult(randomQR);
      setIsScanning(false);
    }, 3000);
  };

  const handleScanSuccess = async (patientData) => {
    setLoading(true);
    
    try {
      // Simulate API call to fetch patient vault
      // In real app: const response = await fetch(`/api/patients/${patientData.id}/vault`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Navigate to patient details page
      navigate(`/patient/${patientData.id}`);
    } catch (err) {
      setError('Failed to fetch patient data. Please try again.');
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setIsScanning(false);
    setScanResult(null);
    setError(null);
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">QR Code Scanner</h1>
        <p className="mt-2 text-gray-600">Scan a patient's QR code to access their health vault</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Scanner Interface */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Scanner</h2>
          
          {!isScanning && !scanResult && !loading && (
            <div className="text-center py-12">
              <div className="mx-auto h-24 w-24 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-6">
                <QrCode className="h-12 w-12 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Scan</h3>
              <p className="text-gray-600 mb-6">Click the button below to start scanning patient QR codes</p>
              <button
                onClick={startScan}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Camera className="mr-2 h-5 w-5" />
                Start Scanning
              </button>
            </div>
          )}

          {isScanning && (
            <div className="text-center py-12">
              <div className="mx-auto h-24 w-24 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <Camera className="h-12 w-12 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Scanning...</h3>
              <p className="text-gray-600 mb-6">Point your camera at the patient's QR code</p>
              
              {/* Scanning Animation */}
              <div className="relative mx-auto w-64 h-64 border-2 border-dashed border-blue-300 rounded-lg">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-blue-500 rounded-lg animate-pulse"></div>
                </div>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 animate-ping"></div>
              </div>
            </div>
          )}

          {scanResult && !loading && (
            <div className="text-center py-8">
              <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">QR Code Detected!</h3>
              <p className="text-gray-600 mb-6">Patient information found</p>
              
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <div className="text-left">
                  <p className="text-sm text-gray-600">Patient ID</p>
                  <p className="font-semibold text-gray-900">{scanResult.id}</p>
                  <p className="text-sm text-gray-600 mt-2">Name</p>
                  <p className="font-semibold text-gray-900">{scanResult.name}</p>
                  <p className="text-sm text-gray-600 mt-2">Age</p>
                  <p className="font-semibold text-gray-900">{scanResult.age} years</p>
                </div>
              </div>
              
              <div className="space-x-3">
                <button
                  onClick={() => handleScanSuccess(scanResult)}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Access Patient Vault
                </button>
                <button
                  onClick={resetScanner}
                  className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                >
                  Scan Another
                </button>
              </div>
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Loader className="h-8 w-8 text-blue-600 animate-spin" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Patient Data</h3>
              <p className="text-gray-600 mb-6">Fetching patient health vault...</p>
              
              {/* Loading Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
              <p className="text-sm text-gray-500">Please wait while we securely retrieve the patient's records</p>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error Occurred</h3>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={resetScanner}
                className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">How to Use</h2>
          
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-blue-600">1</span>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900">Position the QR Code</h3>
                <p className="text-sm text-gray-600 mt-1">Ensure the patient's QR code is clearly visible and well-lit</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-blue-600">2</span>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900">Start Scanning</h3>
                <p className="text-sm text-gray-600 mt-1">Click the "Start Scanning" button to activate the camera</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-blue-600">3</span>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900">Access Vault</h3>
                <p className="text-sm text-gray-600 mt-1">Once detected, click "Access Patient Vault" to view records</p>
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Demo Mode</h3>
            <p className="text-sm text-blue-700">
              This is a demonstration version. In production, this would integrate with a real camera API and backend services.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
