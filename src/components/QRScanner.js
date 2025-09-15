import React, { useState, useRef, useEffect } from 'react';
import { QrCode, Camera, CheckCircle, AlertCircle, Loader, Mail } from 'lucide-react';
import Footer from './Footer';

const QRScanner = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [patientData, setPatientData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [manualQRCode, setManualQRCode] = useState('');
  const [stream, setStream] = useState(null);
  const [showPatientProfile, setShowPatientProfile] = useState(false);
  const videoRef = useRef(null);

  const startScan = async () => {
    try {
      setIsScanning(true);
      setScanResult(null);
      setPatientData(null);
      setError(null);

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError('Camera access denied. Please allow camera access and try again.');
      setIsScanning(false);
    }
  };

  const stopScan = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsScanning(false);
  };

  // Fake QR detect loop (replace with real library in production)
  const detectQRCode = () => {
    if (!videoRef.current || !isScanning) return;
    setTimeout(() => {
      if (isScanning) {
        // For now simulate QR detection with placeholder
        const sampleQrUrl =
          "https://healthvault-backend-c6xl.onrender.com/portal/access?token=demoToken123";
        handleScanSuccess(sampleQrUrl);
      }
    }, 3000);
  };

  useEffect(() => {
    if (isScanning && videoRef.current) {
      const interval = setInterval(detectQRCode, 1000);
      return () => clearInterval(interval);
    }
  }, [isScanning]);

  const handleManualQRSubmit = async (e) => {
    e.preventDefault();
    if (!manualQRCode.trim()) return;
    await handleScanSuccess(manualQRCode.trim());
  };

  const handleScanSuccess = async (qrCode) => {
    stopScan();
    setScanResult(qrCode);
    setLoading(true);
    setError(null);

    try {
      // Extract token from qrUrl
      let token = null;
      try {
        const url = new URL(qrCode);
        token = new URLSearchParams(url.search).get("token");
      } catch {
        // if it's already just the token
        token = qrCode;
      }

      if (!token) {
        setError("Invalid QR code: no token found");
        setLoading(false);
        return;
      }

      // Call hosted backend
      const response = await fetch(
        `https://healthvault-backend-c6xl.onrender.com/api/qr/preview?token=${encodeURIComponent(token)}`
      );

      const data = await response.json();

      if (data.ok) {
        setPatientData(data.patient); // { name, email }
        setShowPatientProfile(true);
      } else {
        setError(data.msg || "Failed to fetch patient data");
      }
    } catch (err) {
      setError("Failed to fetch patient data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    stopScan();
    setScanResult(null);
    setPatientData(null);
    setError(null);
    setLoading(false);
    setManualQRCode('');
    setShowPatientProfile(false);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto w-full flex-grow p-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            QR Code Scanner
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Scan a patient's QR code to access their info
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Scanner Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border p-6">
            {!isScanning && !scanResult && (
              <div className="text-center">
                <div className="mx-auto h-24 w-24 bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mb-6">
                  <QrCode className="h-12 w-12 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Ready to Scan
                </h3>
                <p className="text-gray-600 mb-6">
                  Click below to start scanning a patient's QR
                </p>
                <button
                  onClick={startScan}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-medium"
                >
                  <Camera className="h-5 w-5 inline mr-2" />
                  Start Scanning
                </button>
              </div>
            )}

            {isScanning && (
              <div className="text-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-64 object-cover rounded-lg mb-4"
                />
                <button
                  onClick={stopScan}
                  className="w-full bg-red-600 text-white py-3 px-6 rounded-xl"
                >
                  Stop Scanning
                </button>
              </div>
            )}

            {loading && (
              <div className="text-center">
                <Loader className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
                <p>Loading patient data...</p>
              </div>
            )}

            {error && (
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={resetScanner}
                  className="w-full bg-red-600 text-white py-2 rounded"
                >
                  Try Again
                </button>
              </div>
            )}

            {showPatientProfile && patientData && (
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Patient Found
                </h3>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
                  <h4 className="text-xl font-bold">{patientData.name}</h4>
                  <div className="flex items-center justify-center mt-2 text-gray-600">
                    <Mail className="h-4 w-4 mr-2" />
                    <span>{patientData.email}</span>
                  </div>
                </div>
                <button
                  onClick={resetScanner}
                  className="w-full mt-4 bg-gray-500 text-white py-2 rounded"
                >
                  Scan Another QR
                </button>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-4">How to Use</h3>
            <ol className="space-y-2 text-sm text-gray-700">
              <li>1. Click "Start Scanning"</li>
              <li>2. Point your camera at patient's QR</li>
              <li>3. Patient's name and email will appear</li>
            </ol>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default QRScanner;
