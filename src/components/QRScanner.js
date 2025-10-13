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
  const [sessionRequest, setSessionRequest] = useState(null);
  const [sessionStatus, setSessionStatus] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const hasNavigatedRef = useRef(false);
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

  // Session management functions
  const requestPatientAccess = async (patientId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found. Please log in.');
      }

      console.log('🔄 Requesting patient access:', {
        patientId: patientId,
        apiUrl: `${API_BASE}/sessions/request`,
        hasToken: !!token
      });

      const response = await fetch(`${API_BASE}/sessions/request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          patientId: patientId,
          requestMessage: 'Doctor requesting access to view your medical records'
        })
      });

      console.log('📡 Session request response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      const data = await response.json();
      console.log('📋 Session request data:', data);
      
      if (!response.ok) {
        console.error('❌ Session request failed:', data);
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (data.success) {
        console.log('✅ Session request successful:', data.session);
        setSessionRequest(data.session);
        startPollingSession(data.session._id);
        return data.session;
      } else {
        throw new Error(data.message || 'Failed to request access');
      }
    } catch (error) {
      console.error('💥 Session request error:', error);
      throw error;
    }
  };

  const startPollingSession = (sessionId, patientId) => {
    console.log('🔄 Starting session polling:', { sessionId, patientId });
    
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    let pollCount = 0;
    const maxPolls = 30; // 30 polls * 2 seconds = 60 seconds timeout

    const interval = setInterval(async () => {
      pollCount++;
      console.log(`🔄 Polling session status (attempt ${pollCount}/${maxPolls}):`, sessionId);
      
      try {
        const sessionData = await pollSessionStatus(sessionId);
        
        if (sessionData) {
          console.log('📋 Session status update:', {
            sessionId: sessionId,
            status: sessionData.status,
            expiresAt: sessionData.expiresAt,
            patientId: patientId
          });

          if (sessionData.status === 'accepted') {
            console.log('✅ Session accepted! Redirecting to patient details...');
            clearInterval(interval);
            setPollingInterval(null);
            // Stop camera immediately once we have a result
            try { stopScan(); } catch {}
            
            // Prevent multiple navigation attempts
            if (isNavigating) {
              console.log('⚠️ Navigation already in progress, skipping...');
              return;
            }
            
            setIsNavigating(true);
            
            // Add debugging for navigation
            const navigationPath = `/patient-details/${patientId}`;
            console.log('🔄 Navigating to:', navigationPath);
            console.log('🔍 Patient ID for navigation:', patientId);
            console.log('🔍 Current location:', window.location.href);
            
            // Navigate to patient details just once
            if (!hasNavigatedRef.current) {
              hasNavigatedRef.current = true;
              navigate(navigationPath, { replace: true });
            }
            
            // Additional debug after navigation attempt
            setTimeout(() => {
              console.log('🔍 Navigation completed, new location:', window.location.href);
              setIsNavigating(false);
            }, 100);
            
            return;
            
          } else if (sessionData.status === 'declined') {
            console.log('❌ Session declined by patient');
            clearInterval(interval);
            setPollingInterval(null);
            try { stopScan(); } catch {}
            setSessionStatus('declined');
            setError('Access request declined by patient.');
            return;
            
          } else if (sessionData.status === 'expired') {
            console.log('⏰ Session expired');
            clearInterval(interval);
            setPollingInterval(null);
            try { stopScan(); } catch {}
            setSessionStatus('expired');
            setError('Session request expired. Please try again.');
            return;
          }
          
          // Still pending, continue polling
          setSessionStatus('pending');
        }
        
        // Check timeout
        if (pollCount >= maxPolls) {
          console.log('⏰ Polling timeout reached');
          clearInterval(interval);
          setPollingInterval(null);
          setSessionStatus('timeout');
          setError('Patient did not respond to the request. Please try again.');
        }
        
      } catch (error) {
        console.error('❌ Polling error:', error);
        pollCount++; // Count errors toward timeout
        
        if (pollCount >= maxPolls) {
          clearInterval(interval);
          setPollingInterval(null);
          setError('Failed to check session status. Please try again.');
        }
      }
    }, 2000); // Poll every 2 seconds

    setPollingInterval(interval);
  };

  const pollSessionStatus = async (sessionId) => {
    try {
      const token = localStorage.getItem('token');
      
      console.log('🔍 Polling session status for ID:', sessionId);
      
      const response = await fetch(`${API_BASE}/sessions/${sessionId}/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Session status response:', {
        status: response.status,
        ok: response.ok
      });

      if (!response.ok) {
        console.error('❌ Failed to fetch session status:', response.status);
        return null;
      }

      const data = await response.json();
      console.log('📋 Session status data:', data);
      
      if (data.success && data.session) {
        const session = data.session;
        
        console.log('🔍 Session details:', {
          sessionId: session._id,
          status: session.status,
          expiresAt: session.expiresAt,
          timeRemaining: session.timeRemaining,
          isExpired: session.isExpired,
          patientName: session.patient?.name
        });

        return session;
      } else {
        console.error('❌ Invalid session status response:', data);
        return null;
      }
      
    } catch (error) {
      console.error('❌ Session polling error:', error);
      return null;
    }
  };

  // Cleanup polling on component unmount
  React.useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      // Always stop camera when leaving page
      try { stopScan(); } catch {}
    };
  }, [pollingInterval]);

  const startScan = async () => {
    try {
      // Ensure any previous camera stream is fully stopped before starting a new one
      if (stream) {
        try { stream.getTracks().forEach(t => t.stop()); } catch {}
        if (videoRef.current) {
          try { videoRef.current.pause(); } catch {}
          videoRef.current.srcObject = null;
        }
        setStream(null);
      }
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
      try { stream.getTracks().forEach(track => track.stop()); } catch {}
      setStream(null);
    }
    if (videoRef.current) {
      try { videoRef.current.pause(); } catch {}
      videoRef.current.srcObject = null;
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
    setSessionRequest(null);
    setSessionStatus(null);

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

      console.log('🔍 QR Scanner - Extracting patient ID from token:', patientToken);

      // Decode the token to get patient ID directly (for anonymous tokens)
      let patientId = null;
      let user = null;
      let tokenPayload = null;
      
      try {
        tokenPayload = JSON.parse(atob(patientToken.split('.')[1]));
        console.log('🔍 QR Scanner - Token payload:', tokenPayload);
        
        if (tokenPayload.role === 'anonymous' && tokenPayload.userId) {
          patientId = tokenPayload.userId;
          console.log('✅ QR Scanner - Anonymous token decoded, patientId:', patientId);
          
          // For anonymous tokens, we don't have full user data, so we'll fetch it later
          // or use a minimal user object for now
          user = {
            _id: patientId,
            id: patientId,
            name: 'Patient', // Will be fetched later
            email: 'patient@example.com' // Will be fetched later
          };
        } else {
          // For non-anonymous tokens, call /auth/me
          const patientResponse = await fetch(`${API_BASE}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${patientToken}`,
              'Content-Type': 'application/json'
            }
          });

          console.log('📡 QR Scanner - Patient lookup response status:', patientResponse.status);
          
          const patientData = await patientResponse.json();

          if (patientResponse.status === 401) {
            if (patientData.message === "User not found") {
              setError("Invalid patient token - user not found in database");
            } else if (patientData.message === "Invalid token.") {
              setError("Invalid patient token format");
            } else if (patientData.message === "Token expired.") {
              setError("Patient token has expired");
            } else {
              setError(`Authentication failed: ${patientData.message}`);
            }
            return;
          }

          if (patientResponse.status === 403) {
            setError("Patient account is deactivated");
            return;
          }

          if (!patientData.success || !patientData.data || !patientData.data.user) {
            setError(patientData.message || "Failed to identify patient");
            return;
          }

          user = patientData.data.user;
          patientId = user._id || user.id;
        }
      } catch (tokenError) {
        console.error('❌ QR Scanner - Failed to decode token:', tokenError);
        setError("Invalid token format");
        setLoading(false);
        return;
      }

      console.log('✅ QR Scanner - Patient identified:', {
        name: user.name,
        email: user.email,
        patientId: patientId,
        fullUser: user
      });
      
      // Validate patient ID
      if (!patientId) {
        setError('Invalid patient data: no patient ID found');
        setLoading(false);
        return;
      }

      // Check if patient ID is a valid MongoDB ObjectId format
      const objectIdRegex = /^[0-9a-fA-F]{24}$/;
      if (!objectIdRegex.test(patientId)) {
        console.error('❌ Invalid patient ID format:', patientId);
        setError(`Invalid patient ID format: ${patientId}`);
        setLoading(false);
        return;
      }
      
      // Check if this is an anonymous token AND the user is not logged in
      const storedToken = localStorage.getItem('token');
      const storedRole = localStorage.getItem('role');
      const isLoggedInDoctor = storedToken && storedRole === 'doctor';
      const isAnonymousToken = tokenPayload.role === 'anonymous';
      
      if (isAnonymousToken && !isLoggedInDoctor) {
        console.log('👻 QR Scanner - Anonymous token detected, navigating directly to patient details');
        
        // For anonymous tokens, navigate directly to patient details with token
        const navigationPath = `/patient-details/${patientId}?token=${encodeURIComponent(patientToken)}`;
        console.log('🔄 Navigating to anonymous patient details:', navigationPath);
        
        setLoading(false);
        if (!hasNavigatedRef.current) {
          hasNavigatedRef.current = true;
          navigate(navigationPath, { replace: true });
        }
        return;
      }
      
      if (isLoggedInDoctor) {
        console.log('🔐 QR Scanner - Logged in doctor detected, using doctor session flow');
        // Continue with doctor session flow below
      }
      
      // Cache the patient data for future reference
      const patientInfo = {
        id: patientId,
        name: user.name,
        email: user.email,
        mobile: user.mobile
      };
      
      savePatientToCache(patientInfo);
      
      // Also store as last scanned patient for continue button
      localStorage.setItem('lastScannedPatient', JSON.stringify(patientInfo));

      // Request session access for this patient (for registered doctors)
      console.log('📋 QR Scanner - Requesting session access for patient:', patientId);
      
      try {
        const sessionData = await requestPatientAccess(patientId);
        console.log('✅ Session request created:', sessionData);
        // Stop camera as soon as the request is sent; we don't need the camera active anymore
        try { stopScan(); } catch {}
        
        // Start polling for session status
        if (sessionData && sessionData._id) {
          startPollingSession(sessionData._id, patientId);
        }
        
        setLoading(false);
        
      } catch (sessionError) {
        console.error('❌ Session request failed:', sessionError);
        
        // Check if the error is about existing session
        if (sessionError.message && sessionError.message.includes('already have a')) {
          
          if (sessionError.message.includes('accepted')) {
            console.log('✅ Existing accepted session found, navigating to patient details');
            
            // Prevent multiple navigation attempts
            if (isNavigating) {
              console.log('⚠️ Navigation already in progress, skipping...');
              setLoading(false);
              return;
            }
            
            setIsNavigating(true);
            
            const navigationPath = `/patient-details/${patientId}`;
            console.log('🔄 Navigating to existing session patient:', navigationPath);
            console.log('🔍 Patient ID for existing session:', patientId);
            
            setLoading(false);
            if (!hasNavigatedRef.current) {
              hasNavigatedRef.current = true;
              navigate(navigationPath, { replace: true });
            }
            
            // Debug navigation
            setTimeout(() => {
              console.log('🔍 Existing session navigation completed, new location:', window.location.href);
              setIsNavigating(false);
            }, 100);
            
          } else if (sessionError.message.includes('pending')) {
            console.log('⏳ Existing pending session found, need to poll for status');
            setLoading(false);
            setError('You already have a pending request with this patient. The system will check for updates...');
            
            // Try to find the existing session ID and poll it
            // For now, show waiting state
            setSessionStatus('pending');
            
          } else {
            setLoading(false);
            setError('You already have a session with this patient. Please wait or try again later.');
          }
        } else {
          setError(`Failed to request patient access: ${sessionError.message}`);
          setLoading(false);
        }
      }

    } catch (err) {
      console.error('💥 QR scan error:', err);
      setError("Failed to process QR code. Please try again.");
      setLoading(false);
    }
  };

  const resetScanner = () => {
    console.log('🔄 Resetting scanner and cleaning up polling');
    
    stopScan();
    
    // Clean up polling interval
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
      console.log('✅ Polling interval cleared');
    }
    
    // Reset all state
    setScanResult(null);
    setPatientData(null);
    setError(null);
    setLoading(false);
    setManualQRCode('');
    setShowPatientProfile(false);
    setSessionRequest(null);
    setSessionStatus(null);
    setIsNavigating(false);
    
    console.log('✅ Scanner state reset');
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

            {loading && !sessionRequest && (
              <div className="text-center">
                <Loader className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
                <p>Processing QR code...</p>
              </div>
            )}

            {(sessionRequest || sessionStatus === 'pending') && sessionStatus !== 'accepted' && sessionStatus !== 'declined' && (
              <div className="text-center">
                <div className="mx-auto h-16 w-16 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-2xl flex items-center justify-center mb-6">
                  <Mail className="h-8 w-8 text-yellow-600 animate-pulse" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Waiting for Patient Approval
                </h3>
                <p className="text-gray-600 mb-4">
                  Access request sent to patient
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  The patient will receive a notification on their mobile app to approve or decline your request.
                  This will timeout in 60 seconds if no response is received.
                </p>
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-center space-x-2">
                    <Loader className="h-4 w-4 text-blue-600 animate-spin" />
                    <span className="text-sm text-blue-700">Checking for response every 2 seconds...</span>
                  </div>
                </div>
                <button
                  onClick={resetScanner}
                  className="w-full bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel Request
                </button>
              </div>
            )}

            {error && (
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                <p className="text-red-600 mb-4">{error}</p>
                <div className="space-y-2">
                  {error.includes('already have a') && error.includes('accepted') ? (
                    <button
                      onClick={() => {
                        const user = JSON.parse(localStorage.getItem('lastScannedPatient') || '{}');
                        if (user.id) {
                          navigate(`/patient-details/${user.id}`);
                        } else {
                          resetScanner();
                        }
                      }}
                      className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors mb-2"
                    >
                      Continue to Patient Details
                    </button>
                  ) : null}
                  <button
                    onClick={resetScanner}
                    className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
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
                
                <button
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem('token');
                      if (!token) {
                        alert('Please log in as a doctor first');
                        return;
                      }
                      
                      const response = await fetch(`${API_BASE}/sessions/debug`, {
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json'
                        }
                      });
                      const data = await response.json();
                      console.log('🔍 Debug info:', data);
                      alert(`Debug info logged to console. Role: ${data.debug?.authRole}`);
                    } catch (error) {
                      console.error('Debug error:', error);
                      alert('Debug failed - check console');
                    }
                  }}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors mb-3"
                >
                  Debug Doctor Auth
                </button>
                
                <button
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem('token');
                      if (!token) {
                        alert('Please log in as a doctor first');
                        return;
                      }
                      
                      console.log('🧪 Starting session creation test...');
                      
                      const response = await fetch(`${API_BASE}/sessions/test-create`, {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                          patientId: '507f1f77bcf86cd799439011'
                        })
                      });
                      
                      console.log('📡 Test response:', {
                        status: response.status,
                        statusText: response.statusText,
                        ok: response.ok
                      });
                      
                      const data = await response.json();
                      console.log('📋 Test session result:', data);
                      
                      if (data.success) {
                        alert(`✅ Test session created successfully!\nSession ID: ${data.sessionId}\nTest Patient: ${data.testPatient?.name}`);
                      } else {
                        console.error('❌ Test failed:', data);
                        alert(`❌ Test failed: ${data.message}\nError: ${data.error || 'Unknown error'}\nCheck console for details.`);
                      }
                    } catch (error) {
                      console.error('💥 Test session error:', error);
                      alert(`💥 Test session failed: ${error.message}\nCheck console for full error details.`);
                    }
                  }}
                  className="w-full bg-purple-600 text-white py-2 px-4 rounded-md font-medium hover:bg-purple-700 transition-colors mb-3"
                >
                  Test Session Creation
                </button>
                
                <button
                  onClick={async () => {
                    try {
                      console.log('🔍 Testing session routes health...');
                      
                      const healthResponse = await fetch(`${API_BASE}/sessions/health`);
                      const healthData = await healthResponse.json();
                      console.log('🏥 Health check:', healthData);
                      
                      const dbResponse = await fetch(`${API_BASE}/sessions/db-test`);
                      const dbData = await dbResponse.json();
                      console.log('🗄️ DB test:', dbData);
                      
                      if (healthData.success && dbData.success) {
                        alert('✅ All systems working!\nSession routes: OK\nDatabase: OK\nSession model: OK');
                      } else {
                        alert('⚠️ Some issues detected. Check console for details.');
                      }
                    } catch (error) {
                      console.error('💥 Health check error:', error);
                      alert(`💥 Health check failed: ${error.message}`);
                    }
                  }}
                  className="w-full bg-orange-600 text-white py-2 px-4 rounded-md font-medium hover:bg-orange-700 transition-colors mb-3"
                >
                  Health Check
                </button>
                
                <button
                  onClick={async () => {
                    try {
                      const lastPatient = JSON.parse(localStorage.getItem('lastScannedPatient') || '{}');
                      if (!lastPatient.id) {
                        alert('No patient scanned yet. Scan a QR code first.');
                        return;
                      }
                      
                      const token = localStorage.getItem('token');
                      const response = await fetch(`${API_BASE}/sessions/debug/${lastPatient.id}`, {
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json'
                        }
                      });
                      
                      const data = await response.json();
                      console.log('🔍 Session debug for patient:', data);
                      
                      if (data.success) {
                        const debug = data.debug;
                        alert(`Session Debug for ${lastPatient.name}:\n\n` +
                              `Total Sessions: ${debug.allSessions.length}\n` +
                              `Active Session: ${debug.activeSession ? 'YES' : 'NO'}\n` +
                              `Status: ${debug.activeSession?.status || 'None'}\n` +
                              `Expires: ${debug.activeSession?.expiresAt || 'N/A'}\n\n` +
                              `Check console for full details.`);
                      } else {
                        alert(`Debug failed: ${data.error}`);
                      }
                    } catch (error) {
                      console.error('Session debug error:', error);
                      alert('Session debug failed - check console');
                    }
                  }}
                  className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md font-medium hover:bg-indigo-700 transition-colors mb-3"
                >
                  Debug Last Patient Session
                </button>
                
                <button
                  onClick={() => {
                    try {
                      const lastPatient = JSON.parse(localStorage.getItem('lastScannedPatient') || '{}');
                      if (!lastPatient.id) {
                        alert('No patient scanned yet. Scan a QR code first.');
                        return;
                      }
                      
                      const navigationPath = `/patient-details/${lastPatient.id}`;
                      console.log('🧪 Testing navigation to:', navigationPath);
                      console.log('🔍 Current location before navigation:', window.location.href);
                      
                      navigate(navigationPath);
                      
                      setTimeout(() => {
                        console.log('🔍 Location after test navigation:', window.location.href);
                        alert(`Navigation test completed!\nTarget: ${navigationPath}\nCurrent: ${window.location.pathname}`);
                      }, 200);
                      
                    } catch (error) {
                      console.error('Navigation test error:', error);
                      alert('Navigation test failed - check console');
                    }
                  }}
                  className="w-full bg-teal-600 text-white py-2 px-4 rounded-md font-medium hover:bg-teal-700 transition-colors mb-3"
                >
                  Test Navigation to Last Patient
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
