import React, { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useNavigate } from 'react-router-dom';
import { QrCode, Camera, CheckCircle, AlertCircle, Loader } from 'lucide-react';

// Footer Component
const Footer = () => (
  <footer className="w-full py-6 border-t border-gray-200 flex items-center justify-center mt-12">
    <img src="/AiAllyLogo.png" alt="Ai Ally Logo" className="h-6 mr-2" />
    <span className="text-sm text-gray-500">Powered by Ai Ally</span>
  </footer>
);

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
      const randomQR = demoQRCodes[Math.floor(Math.random() * demoQRCodes.length)];
      setScanResult(randomQR);
      setIsScanning(false);
    }, 3000);
  };

  const handleScanSuccess = async (patientData) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
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
    <div className="min-h-screen flex flex-col justify-between">
      <div className="max-w-4xl mx-auto w-full flex-grow p-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">QR Code Scanner</h1>
          <p className="mt-2 text-gray-600">Scan a patient's QR code to access their health vault</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Scanner Interface */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            {/* ... your scanner logic remains unchanged ... */}
          </div>

          {/* Instructions */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            {/* ... instructions remain unchanged ... */}
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default QRScanner;
