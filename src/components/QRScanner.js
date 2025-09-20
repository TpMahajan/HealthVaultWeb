import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Camera, CheckCircle, AlertCircle, Loader, Mail } from 'lucide-react';
import jsQR from 'jsqr';
import { API_BASE } from '../constants/api';
import Footer from './Footer';

const QRScanner = () => {
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [patientData, setPatientData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [manualQRCode, setManualQRCode] = useState('');
  const [stream, setStream] = useState(null);
  const [showPatientProfile, setShowPatientProfile] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Patient caching functions
  const savePatientToCache = (patientData) => {
    try {
      const patients = getCachedPatients();
      const patientWithExpiry = {
        id: patientData.id,
        name: patientData.name,
        email: patientData.email,
        mobile: patientData.mobile,
        expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days from now
      };

      // Check if patient already exists and update it
      const existingIndex = patients.findIndex(p => p.id === patientData.id);
      if (existingIndex >= 0) {
        patients[existingIndex] = patientWithExpiry;
      } else {
        patients.push(patientWithExpiry);
      }

      localStorage.setItem('patients', JSON.stringify(patients));
      console.log('✅ Patient cached successfully:', patientWithExpiry);
    } catch (error) {
      console.error('❌ Error caching patient:', error);
    }
  };

  const getCachedPatients = () => {
    try {
      const cached = localStorage.getItem('patients');
      if (!cached) return [];
      
      const patients = JSON.parse(cached);
      // Filter out expired patients
      const validPatients = patients.filter(patient => patient.expiresAt > Date.now());
      
      // Update localStorage with only valid patients
      if (validPatients.length !== patients.length) {
        localStorage.setItem('patients', JSON.stringify(validPatients));
        console.log(`🧹 Cleaned up ${patients.length - validPatients.length} expired patients`);
      }
      
      return validPatients;
    } catch (error) {
      console.error('❌ Error reading cached patients:', error);
      return [];
    }
  };

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

  // Real QR code detection using jsQR
  const detectQRCode = () => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Check if video has proper dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.log('Video not ready yet, dimensions:', video.videoWidth, 'x', video.videoHeight);
      return;
    }

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data from canvas
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    // Detect QR code
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code) {
      console.log('QR Code detected:', code.data);
      handleScanSuccess(code.data);
    }
  };

  useEffect(() => {
    if (isScanning && videoRef.current) {
      const interval = setInterval(detectQRCode, 100); // Check every 100ms for better responsiveness
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
      // Extract token from QR code
      let patientToken = null;
      try {
        const url = new URL(qrCode);
        // Check if it's a URL with token parameter
        const token = new URLSearchParams(url.search).get("token");
        if (token) {
          patientToken = token;
        } else {
          // If it's a direct URL, use the pathname
          patientToken = url.pathname.split('/').pop();
        }
      } catch {
        // If it's not a URL, use it directly as token
        patientToken = qrCode;
      }

      if (!patientToken) {
        setError("Invalid QR code: no valid token found");
        setLoading(false);
        return;
      }

      console.log('🔍 QR Scanner - Fetching patient data with token:', patientToken);
      console.log('🔍 QR Scanner - Token length:', patientToken.length);

      // Fetch patient data using the /auth/me endpoint with the patient's token
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${patientToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 QR Scanner - Response status:', response.status);
      
      const data = await response.json();
      console.log('📋 QR Scanner - Patient data response:', data);

      if (response.status === 401) {
        if (data.message === "User not found") {
          setError("Invalid patient token - user not found in database");
        } else if (data.message === "Invalid token.") {
          setError("Invalid patient token format");
        } else if (data.message === "Token expired.") {
          setError("Patient token has expired");
        } else {
          setError(`Authentication failed: ${data.message}`);
        }
        return;
      }

      if (response.status === 403) {
        setError("Patient account is deactivated");
        return;
      }

      if (data.success && data.data && data.data.user) {
        const user = data.data.user;
        
        // Cache the patient data
        savePatientToCache({
          id: user._id || user.id,
          name: user.name,
          email: user.email,
          mobile: user.mobile
        });

        console.log('✅ QR Scanner - Patient found, redirecting to PatientDetails');
        
        // Redirect to PatientDetails page with patient token
        navigate(`/patient-details/${user._id || user.id}?token=${encodeURIComponent(patientToken)}`);
      } else {
        setError(data.message || "Failed to fetch patient data");
      }
    } catch (err) {
      console.error('💥 QR scan error:', err);
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
                {/* Hidden canvas for QR detection */}
                <canvas
                  ref={canvasRef}
                  style={{ display: 'none' }}
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
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Patient Found
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Redirecting to patient details...
                </p>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            )}
          </div>

          {/* Manual QR Input & Instructions */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border p-6">
            <h3 className="text-lg font-semibold mb-4">Manual QR Code Entry</h3>
            <form onSubmit={handleManualQRSubmit} className="mb-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Enter QR Code URL or Token:
                </label>
                <input
                  type="text"
                  value={manualQRCode}
                  onChange={(e) => setManualQRCode(e.target.value)}
                  placeholder="https://healthvault-backend-c6xl.onrender.com/portal/access?token=demoToken123"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <button
                type="submit"
                disabled={!manualQRCode.trim()}
                className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white py-2 px-4 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Process QR Code
              </button>
            </form>

            <div className="border-t pt-4">
              <h4 className="text-md font-semibold mb-3">How to Use</h4>
              <ol className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li>1. Click "Start Scanning" to use camera</li>
                <li>2. Point your camera at patient's QR code</li>
                <li>3. Or manually enter QR code URL/token above</li>
                <li>4. Patient's name and email will appear</li>
              </ol>
            </div>

            <div className="border-t pt-4 mt-4">
              <h4 className="text-md font-semibold mb-3">Test Patient Tokens</h4>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div>• <strong>Quick Test:</strong></div>
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch(`${API_BASE}/auth/test-patient`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                      });
                      const data = await response.json();
                      if (data.success) {
                        setManualQRCode(data.token);
                        alert('Test token generated! Click "Process QR Code" to test.');
                      } else {
                        alert('Failed to generate test token');
                      }
                    } catch (error) {
                      console.error('Test token generation error:', error);
                      alert('Error generating test token');
                    }
                  }}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-md font-medium hover:bg-green-700 transition-colors mb-3"
                >
                  Generate Test Patient Token
                </button>
                <div>• <strong>Manual Testing:</strong></div>
                <div className="ml-4 space-y-1">
                  <div>1. Create a patient account via mobile app</div>
                  <div>2. Get the patient's JWT token</div>
                  <div>3. Paste the token directly or as URL</div>
                </div>
                <div className="mt-2">
                  <strong>Note:</strong> The token must be from a valid patient account in the users collection
                </div>
                <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                  <strong>Debug:</strong> Check browser console for detailed error messages
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default QRScanner;
