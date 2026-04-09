import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Camera, CheckCircle, AlertCircle, Loader, Mail, X, Activity, Clock, Lightbulb, User } from 'lucide-react';
import jsQR from 'jsqr';
import { API_BASE } from '../constants/api';
import { useAuth } from '../context/AuthContext';
import Footer from './Footer';

const QRScanner = () => {
  const { user } = useAuth();
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
  const isProcessingScanRef = useRef(false);
  const lastDetectedQrRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [recentScans, setRecentScans] = useState([]);
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;

  // Load recent scans from cache on mount
  useEffect(() => {
    const loadRecentScans = () => {
      try {
        const cached = JSON.parse(localStorage.getItem('patients') || '[]');
        // Sort newest first (by expiresAt as proxy), take last 5
        const sorted = [...cached]
          .sort((a, b) => (b.expiresAt || 0) - (a.expiresAt || 0))
          .slice(0, 5)
          .map(p => ({
            ...p,
            scannedAt: p.expiresAt ? new Date(p.expiresAt - 7 * 24 * 60 * 60 * 1000) : new Date(),
          }));
        setRecentScans(sorted);
      } catch {}
    };
    loadRecentScans();
  }, [scanResult]); // Re-run after each successful scan

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
      // Return all patients (both active and expired) to preserve history
      return patients;
    } catch (error) {
      console.error('❌ Error reading cached patients:', error);
      return [];
    }
  };

  const decodeJwtPayload = (token) => {
    if (!token || typeof token !== 'string') return null;
    const trimmedToken = token.trim();
    if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(trimmedToken)) {
      return null;
    }

    const parts = trimmedToken.split('.');
    if (parts.length !== 3) return null;

    try {
      const base64Payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padding = '='.repeat((4 - (base64Payload.length % 4)) % 4);
      return JSON.parse(atob(`${base64Payload}${padding}`));
    } catch (decodeError) {
      console.warn('[QR Scanner] Failed to decode token payload:', decodeError);
      return null;
    }
  };

  const extractQrReference = (qrValue) => {
    const rawValue = String(qrValue || '').trim();
    let patientToken = null;
    let patientId = null;
    let source = 'raw';

    const safeDecode = (value) => {
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    };

    const extractPatientIdFromPath = (pathname) => {
      const parts = pathname
        .split('/')
        .map((part) => safeDecode(part).trim())
        .filter(Boolean);

      if (parts.length === 0) return null;

      const patientDetailsIndex = parts.findIndex(
        (part) => part.toLowerCase() === 'patient-details'
      );

      if (patientDetailsIndex >= 0 && parts[patientDetailsIndex + 1]) {
        const idPart = parts[patientDetailsIndex + 1];
        if (objectIdRegex.test(idPart)) {
          return idPart;
        }
      }

      const lastPart = parts[parts.length - 1];
      return objectIdRegex.test(lastPart) ? lastPart : null;
    };

    if (rawValue) {
      try {
        const url = new URL(rawValue);
        source = 'url';

        const tokenQuery =
          (url.searchParams.get('token') ||
            url.searchParams.get('share') ||
            '').trim();
        const idQuery = (
          url.searchParams.get('id') ||
          url.searchParams.get('patientId') ||
          ''
        ).trim();

        if (tokenQuery) {
          patientToken = tokenQuery;
        }

        if (idQuery && objectIdRegex.test(idQuery)) {
          patientId = idQuery;
        }

        const pathId = extractPatientIdFromPath(url.pathname);
        if (!patientId && pathId) {
          patientId = pathId;
        }

        if (!patientToken && url.pathname) {
          const pathParts = url.pathname
            .split('/')
            .map((part) => safeDecode(part).trim())
            .filter(Boolean);
          const lastPathPart = pathParts[pathParts.length - 1];
          if (lastPathPart && lastPathPart.split('.').length === 3) {
            patientToken = lastPathPart;
          }
        }
      } catch {
        // Not a URL; continue with raw token/id parsing.
      }
    }

    if (!patientId && objectIdRegex.test(rawValue)) {
      patientId = rawValue;
    }

    if (source === 'raw' && !patientToken && rawValue.split('.').length === 3) {
      patientToken = rawValue;
    }

    const tokenPayload = decodeJwtPayload(patientToken);
    const payloadPatientId =
      tokenPayload?.userId ||
      tokenPayload?.uid ||
      tokenPayload?.patientId ||
      tokenPayload?.id ||
      null;

    if (!patientId && typeof payloadPatientId === 'string' && payloadPatientId.trim()) {
      patientId = payloadPatientId.trim();
    }

    return {
      rawValue,
      source,
      patientId,
      patientToken,
      tokenPayload,
    };
  };

  const checkTokenExpiry = async (patientToken, tokenPayload = null) => {
    const result = {
      checked: false,
      valid: true,
      expired: false,
      reason: 'not_checked',
      expiresAt: null,
    };

    if (!patientToken) {
      return { ...result, reason: 'no_token' };
    }

    const payload = tokenPayload || decodeJwtPayload(patientToken);

    if (payload?.exp) {
      const jwtExpiry = payload.exp * 1000;
      result.checked = true;
      result.expiresAt = jwtExpiry;
      if (Date.now() >= jwtExpiry) {
        return {
          ...result,
          valid: false,
          expired: true,
          reason: 'jwt_expired',
        };
      }
    }

    const shouldValidateQrToken =
      payload?.typ === 'vault_share' || payload?.role === 'anonymous';

    if (!shouldValidateQrToken) {
      return {
        ...result,
        reason: result.checked ? 'jwt_checked' : 'skip_non_qr_token',
      };
    }

    try {
      const validateResp = await fetch(
        `${API_BASE}/qr/validate?token=${encodeURIComponent(patientToken)}`
      );

      let validateData = null;
      try {
        validateData = await validateResp.json();
      } catch {
        validateData = null;
      }

      console.log('[QR Scanner] QR validate API response:', {
        status: validateResp.status,
        ok: validateResp.ok,
        body: validateData,
      });

      if (!validateResp.ok || !validateData) {
        return { ...result, reason: 'validate_unavailable' };
      }

      if (validateData.valid === true) {
        if (validateData.expiresAt) {
          const expiresAtMs = new Date(validateData.expiresAt).getTime();
          if (!Number.isNaN(expiresAtMs)) {
            result.expiresAt = expiresAtMs;
            if (Date.now() >= expiresAtMs) {
              return {
                ...result,
                checked: true,
                valid: false,
                expired: true,
                reason: 'validate_expired_at',
              };
            }
          }
        }

        return {
          ...result,
          checked: true,
          valid: true,
          expired: false,
          reason: 'validate_ok',
        };
      }

      if (validateData.valid === false) {
        const reason = String(validateData.reason || 'invalid');
        const payloadExpired = payload?.exp ? Date.now() >= payload.exp * 1000 : false;

        if (reason === 'not_active') {
          return {
            ...result,
            checked: true,
            valid: false,
            expired: true,
            reason,
          };
        }

        if (reason === 'jwt_invalid_or_expired') {
          return {
            ...result,
            checked: true,
            valid: false,
            expired: payloadExpired,
            reason: payloadExpired ? 'jwt_expired' : 'jwt_invalid',
          };
        }

        return {
          ...result,
          checked: true,
          valid: false,
          expired: false,
          reason,
        };
      }

      return { ...result, checked: true, reason: 'validate_unknown_response' };
    } catch (validationError) {
      console.warn('[QR Scanner] QR validate check failed:', validationError);
      return { ...result, reason: 'validate_error' };
    }
  };

  const fetchPatientById = async (patientId) => {
    const endpoints = [
      `${API_BASE}/patients/${patientId}`,
      `${API_BASE}/users/${patientId}`,
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        let data = null;
        try {
          data = await response.json();
        } catch {
          data = null;
        }

        console.log('[QR Scanner] Patient lookup response:', {
          endpoint,
          status: response.status,
          ok: response.ok,
          body: data,
        });

        if (response.status === 404) {
          continue;
        }

        if (!response.ok) {
          continue;
        }

        const userData =
          data?.data?.user ||
          data?.data?.patient ||
          data?.user ||
          data?.patient ||
          null;

        if (userData) {
          const normalizedId = userData._id || userData.id || patientId;
          return {
            _id: normalizedId,
            id: normalizedId,
            name: userData.name || 'Patient',
            email: userData.email || '',
            mobile: userData.mobile || '',
          };
        }

        if (data?.success === true) {
          return {
            _id: patientId,
            id: patientId,
            name: 'Patient',
            email: '',
            mobile: '',
          };
        }
      } catch (lookupError) {
        console.warn(`[QR Scanner] Failed patient lookup for ${endpoint}:`, lookupError);
      }
    }

    return null;
  };

  // Session management functions
  const requestPatientAccess = async (patientId, token = null) => {
    try {
      const authToken = token || localStorage.getItem('token');
      if (!authToken) {
        throw new Error('No authentication token found. Please log in.');
      }

      console.log('🔄 Requesting patient access:', {
        patientId: patientId,
        apiUrl: `${API_BASE}/sessions/request`,
        hasToken: !!authToken
      });

      const response = await fetch(`${API_BASE}/sessions/request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
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
        return data.session;
      } else {
        throw new Error(data.message || 'Failed to request access');
      }
    } catch (error) {
      console.error('💥 Session request error:', error);
      throw error;
    }
  };

  const startPollingSession = (sessionId, patientId, patientToken = null) => {
    console.log('🔄 Starting session polling:', { sessionId, patientId, hasToken: !!patientToken });

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
            try { stopScan(); } catch { }

            // Prevent multiple navigation attempts
            if (isNavigating) {
              console.log('⚠️ Navigation already in progress, skipping...');
              return;
            }

            setIsNavigating(true);

            // Add debugging for navigation
            let navigationPath = `/patient-details/${patientId}`;
            if (patientToken) {
              navigationPath += `?token=${encodeURIComponent(patientToken)}`;
            }
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
            try { stopScan(); } catch { }
            setSessionStatus('declined');
            setError('Access request declined by patient.');
            return;

          } else if (sessionData.status === 'expired') {
            console.log('⏰ Session expired');
            clearInterval(interval);
            setPollingInterval(null);
            try { stopScan(); } catch { }
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
          sessionCreatedAt: session.createdAt,
          status: session.status,
          isActive: session.isActive,
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
      try { stopScan(); } catch { }
    };
  }, [pollingInterval]);

  const startScan = async () => {
    try {
      // Check if doctor is active
      if (user?.isActive === false) {
        setError('Your profile is currently inactive. Please activate your profile in Settings to scan QR codes and attend sessions.');
        return;
      }

      // Ensure any previous camera stream is fully stopped before starting a new one
      if (stream) {
        try { stream.getTracks().forEach(t => t.stop()); } catch { }
        if (videoRef.current) {
          try { videoRef.current.pause(); } catch { }
          videoRef.current.srcObject = null;
        }
        setStream(null);
      }
      isProcessingScanRef.current = false;
      lastDetectedQrRef.current = null;
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
      try { stream.getTracks().forEach(track => track.stop()); } catch { }
      setStream(null);
    }
    if (videoRef.current) {
      try { videoRef.current.pause(); } catch { }
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };

  // Real QR code detection using jsQR
  const detectQRCode = () => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;

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
      const detectedValue = String(code.data || '').trim();
      if (!detectedValue) return;
      if (isProcessingScanRef.current || detectedValue === lastDetectedQrRef.current) {
        return;
      }
      lastDetectedQrRef.current = detectedValue;
      console.log('QR Code detected:', detectedValue);
      handleScanSuccess(detectedValue);
    }
  };

  useEffect(() => {
    let interval = null;
    if (isScanning && videoRef.current) {
      interval = setInterval(detectQRCode, 120); // slightly slower to avoid duplicate fires
    }
    return () => {
      if (interval) try { clearInterval(interval); } catch { }
    };
  }, [isScanning]);

  const handleManualQRSubmit = async (e) => {
    e.preventDefault();
    if (!manualQRCode.trim()) return;

    // Check if doctor is active
    if (user?.isActive === false) {
      setError('Your profile is currently inactive. Please activate your profile in Settings to scan QR codes and attend sessions.');
      return;
    }

    await handleScanSuccess(manualQRCode.trim());
  };

  const handleScanSuccess = async (qrCode) => {
    if (isProcessingScanRef.current) {
      console.log('[QR Scanner] Scan already being processed, skipping duplicate.');
      return;
    }

    isProcessingScanRef.current = true;
    stopScan();
    setScanResult(qrCode);
    setLoading(true);
    setError(null);
    setSessionRequest(null);
    setSessionStatus(null);

    try {
      const parsedQr = extractQrReference(qrCode);
      let patientToken = parsedQr.patientToken;
      let patientId = parsedQr.patientId;
      let tokenPayload = parsedQr.tokenPayload;
      let patientUser = null;

      console.log('[QR Scanner] Parsed QR payload:', {
        source: parsedQr.source,
        extractedId: patientId,
        hasToken: !!patientToken,
      });

      if (!patientToken && !patientId) {
        setError('Invalid QR code. Please scan a valid patient QR.');
        return;
      }

      const expiryCheck = patientToken
        ? await checkTokenExpiry(patientToken, tokenPayload)
        : {
            checked: false,
            valid: true,
            expired: false,
            reason: 'no_token',
            expiresAt: null,
          };

      console.log('[QR Scanner] Expiry check result:', expiryCheck);

      if (expiryCheck.expired) {
        setError('This QR code has expired. Please request a new QR from the patient.');
        return;
      }

      if (expiryCheck.checked && expiryCheck.valid === false && !patientId) {
        setError('Invalid QR code. Please scan a valid patient QR.');
        return;
      }

      if (!patientId && patientToken) {
        const patientResponse = await fetch(`${API_BASE}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${patientToken}`,
            'Content-Type': 'application/json'
          }
        });

        let patientData = null;
        try {
          patientData = await patientResponse.json();
        } catch {
          patientData = null;
        }

        console.log('[QR Scanner] Auth me response:', {
          status: patientResponse.status,
          ok: patientResponse.ok,
          body: patientData,
        });

        if (patientResponse.status === 401) {
          if (patientData?.message === 'Token expired.') {
            setError('This QR code has expired. Please request a new QR from the patient.');
          } else {
            setError('Invalid QR code. Please scan a valid patient QR.');
          }
          return;
        }

        if (patientResponse.status === 403) {
          setError('Patient account is deactivated');
          return;
        }

        if (!patientResponse.ok || !patientData?.success) {
          setError(patientData?.message || 'Invalid QR code. Please scan a valid patient QR.');
          return;
        }

        if (patientData?.data?.user) {
          patientUser = patientData.data.user;
          patientId = patientUser._id || patientUser.id || patientData.data.patientId;
        } else if (patientData?.role === 'anonymous' && patientData?.userId) {
          patientId = patientData.userId;
        }
      }

      if (patientToken && !tokenPayload) {
        tokenPayload = decodeJwtPayload(patientToken);
      }

      if (!patientId && typeof tokenPayload?.userId === 'string') {
        patientId = tokenPayload.userId;
      }

      if (!patientId && typeof tokenPayload?.uid === 'string') {
        patientId = tokenPayload.uid;
      }

      console.log('[QR Scanner] Extracted patient ID:', patientId);

      if (!patientId) {
        setError('Invalid QR code. Patient ID could not be extracted.');
        return;
      }

      if (!objectIdRegex.test(patientId)) {
        setError('Invalid QR code. Patient ID format is incorrect.');
        return;
      }

      const storedToken = localStorage.getItem('token');
      const storedRole = localStorage.getItem('role');
      let isLoggedInDoctor = !!(storedToken && storedRole === 'doctor');
      if (!isLoggedInDoctor && storedToken) {
        try {
          const authPayload = JSON.parse(atob(storedToken.split('.')[1] || ''));
          isLoggedInDoctor = authPayload?.role === 'doctor';
        } catch {
          // Ignore decode failures and keep false
        }
      }

      let patientLookupUser = null;
      if (!isLoggedInDoctor) {
        patientLookupUser = await fetchPatientById(patientId);
      }

      patientUser = {
        ...(patientLookupUser || {}),
        ...(patientUser || {}),
        _id: patientId,
        id: patientId,
      };

      if (!patientUser.name) {
        patientUser.name = 'Patient';
      }

      console.log('[QR Scanner] Patient identified:', {
        name: patientUser.name,
        email: patientUser.email,
        patientId,
      });

      const isAnonymousToken =
        tokenPayload?.role === 'anonymous' || tokenPayload?.typ === 'vault_share';

      if (isAnonymousToken && !isLoggedInDoctor && patientToken) {
        console.log('[QR Scanner] Anonymous token detected, creating anonymous session request.');
        try {
          const response = await fetch(`${API_BASE}/sessions/request`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${patientToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              patientId,
              requestMessage: 'Anonymous Doctor is requesting access to view your medical records'
            })
          });

          const data = await response.json();
          if (!response.ok || !data.success) {
            setError(data.message || 'Failed to send access request');
            return;
          }

          console.log('[QR Scanner] Anonymous session created:', data.session?._id);
          try { stopScan(); } catch { }
          startPollingSession(data.session._id, patientId, patientToken);
          setSessionStatus('pending');
          return;
        } catch (anonymousError) {
          console.error('[QR Scanner] Anonymous session request error:', anonymousError);
          setError('Failed to send anonymous access request');
          return;
        }
      }

      if (isLoggedInDoctor) {
        console.log('[QR Scanner] Logged in doctor detected, using doctor session flow.');
      }

      const patientInfo = {
        id: patientId,
        name: patientUser.name,
        email: patientUser.email,
        mobile: patientUser.mobile
      };

      savePatientToCache(patientInfo);
      localStorage.setItem('lastScannedPatient', JSON.stringify(patientInfo));

      console.log('[QR Scanner] Requesting session access for patient:', patientId);

      try {
        const sessionData = await requestPatientAccess(patientId);
        console.log('[QR Scanner] Session request created:', sessionData);
        try { stopScan(); } catch { }

        if (sessionData && sessionData._id) {
          startPollingSession(sessionData._id, patientId);
        }
      } catch (sessionError) {
        console.error('[QR Scanner] Session request failed:', sessionError);
        setError(`Failed to request patient access: ${sessionError.message}`);
      }

    } catch (err) {
      console.error('[QR Scanner] Scan processing error:', err);
      setError('Failed to process QR code. Please try again.');
    } finally {
      isProcessingScanRef.current = false;
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
    isProcessingScanRef.current = false;
    lastDetectedQrRef.current = null;

    console.log('✅ Scanner state reset');
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] dark:bg-[#0A0A0A] p-6 lg:p-10 xl:p-12 animate-in fade-in duration-700">
      <style>{`
        @keyframes scan {
          0%, 100% { top: 0%; }
          50% { top: 100%; }
        }
        .qr-scanning-line {
          height: 2px;
          background: linear-gradient(to right, transparent, var(--primary-color), transparent);
          position: absolute;
          width: 100%;
          z-index: 10;
          box-shadow: 0 0 15px var(--primary-color);
          animation: scan 2.5s infinite ease-in-out;
        }
        .qr-glass-card {
          background: rgba(255, 255, 255, 0.84);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.55);
          box-shadow: 0 4px 24px rgba(0,0,0,0.045);
        }
        .dark .qr-glass-card {
          background: rgba(24, 24, 27, 0.88);
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow: 0 4px 24px rgba(0,0,0,0.25);
        }
        .qr-primary-btn {
          background: var(--primary-gradient, var(--primary-color));
          color: #fff;
          border: none;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .qr-primary-btn:hover {
          transform: scale(1.025);
          box-shadow: 0 8px 30px color-mix(in srgb, var(--primary-color) 35%, transparent);
        }
        .qr-primary-btn:active { transform: scale(0.96); }
        .qr-primary-btn:disabled { opacity: 0.5; filter: grayscale(0.4); pointer-events: none; }

        .qr-icon-bg {
          background: color-mix(in srgb, var(--primary-color) 12%, transparent);
        }
        .qr-primary-text { color: var(--primary-color); }
        .qr-primary-border { border-color: color-mix(in srgb, var(--primary-color) 30%, transparent); }
        .qr-primary-bg-soft { background: color-mix(in srgb, var(--primary-color) 8%, transparent); }

        .qr-input:focus { box-shadow: 0 0 0 2.5px var(--primary-color); border-color: transparent !important; }

        .qr-glow-ping {
          background: var(--primary-gradient, var(--primary-color));
        }

        .qr-debug-btn {
          background: color-mix(in srgb, var(--primary-color) 6%, white);
          color: var(--primary-color);
          border: 1px solid color-mix(in srgb, var(--primary-color) 20%, transparent);
          transition: background 0.2s ease;
        }
        .dark .qr-debug-btn {
          background: color-mix(in srgb, var(--primary-color) 8%, transparent);
        }
        .qr-debug-btn:hover {
          background: color-mix(in srgb, var(--primary-color) 14%, white);
        }
        .dark .qr-debug-btn:hover {
          background: color-mix(in srgb, var(--primary-color) 16%, transparent);
        }

        .qr-step-icon {
          color: var(--primary-color);
        }
        .qr-pending-ring {
          background: color-mix(in srgb, var(--primary-color) 10%, transparent);
          border: 1px solid color-mix(in srgb, var(--primary-color) 20%, transparent);
        }
        .qr-warning-stripe {
          border-left: 4px solid var(--primary-color);
        }
      `}</style>

      <div className="max-w-7xl mx-auto space-y-6">

        {/* Inactive Profile Warning */}
        {user?.isActive === false && (
          <div className="p-5 qr-glass-card rounded-[20px] qr-warning-stripe animate-in slide-in-from-top duration-500">
            <div className="flex items-start gap-4">
              <div className="p-2 qr-icon-bg rounded-xl shrink-0">
                <AlertCircle className="h-5 w-5 qr-primary-text" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Account Activation Required</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Your profile is currently inactive. You cannot scan QR codes until your profile is active in Settings.
                </p>
                <button
                  onClick={() => navigate('/settings')}
                  className="mt-3 text-sm font-bold qr-primary-text hover:opacity-75 transition-opacity"
                >
                  Go to Settings →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Page Header */}
        <div className="flex items-center gap-4 pb-2">
          <div className="p-3 qr-icon-bg rounded-2xl">
            <QrCode className="h-7 w-7 qr-primary-text" style={{ color: 'var(--primary-color)' }} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">QR Scanner</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Scan or enter a patient token to access records</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8">

          {/* LEFT COLUMN: Main Scanner */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-5">
            <div className="qr-glass-card rounded-[28px] p-7 lg:p-10 relative overflow-hidden group transition-all duration-500 hover:shadow-[0_20px_60px_rgba(0,0,0,0.09)] flex flex-col justify-center">
              {/* Decorative blobs */}
              <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full blur-3xl opacity-30 pointer-events-none" style={{ background: 'color-mix(in srgb, var(--primary-color) 18%, transparent)' }} />
              <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ background: 'color-mix(in srgb, var(--primary-color) 10%, transparent)' }} />

              {/* Idle State */}
              {!isScanning && !scanResult && !loading && !sessionRequest && !error && (
                <div className="relative z-10 text-center space-y-6 py-4">
                  <div className="mx-auto w-20 h-20 bg-white dark:bg-slate-800 rounded-[24px] flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.07)] group-hover:scale-105 transition-transform duration-500 border border-slate-100 dark:border-slate-700">
                    <QrCode style={{ width: '2.25rem', height: '2.25rem', color: 'var(--primary-color)' }} />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Scan Patient QR</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium max-w-sm mx-auto leading-relaxed text-sm">
                      Point your camera at the patient's QR code to securely access their records.
                    </p>
                  </div>
                  <button
                    onClick={startScan}
                    className="qr-primary-btn px-8 py-3.5 rounded-[16px] font-bold text-base flex items-center gap-2.5 mx-auto"
                  >
                    <Camera className="h-5 w-5" />
                    Start Scan
                  </button>
                </div>
              )}

              {/* Scanning State */}
              {isScanning && (
                <div className="relative z-10 space-y-5">
                  <div className="relative w-full bg-slate-900 rounded-[24px] overflow-hidden border-[3px] border-white/70 dark:border-slate-700 shadow-2xl" style={{ aspectRatio: '4/3', maxHeight: '460px' }}>
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    <div className="qr-scanning-line" />
                    {/* Corner markers */}
                    {['top-5 left-5 border-t-[3px] border-l-[3px] rounded-tl-xl', 'top-5 right-5 border-t-[3px] border-r-[3px] rounded-tr-xl', 'bottom-5 left-5 border-b-[3px] border-l-[3px] rounded-bl-xl', 'bottom-5 right-5 border-b-[3px] border-r-[3px] rounded-br-xl'].map((pos, i) => (
                      <div key={i} className={`absolute w-10 h-10 ${pos}`} style={{ borderColor: 'var(--primary-color)' }} />
                    ))}
                    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/65 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-white text-[10px] font-black uppercase tracking-widest">Scanner Active</span>
                    </div>
                  </div>
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                  <button
                    onClick={stopScan}
                    className="w-full py-4 rounded-[18px] bg-white dark:bg-slate-800 text-rose-500 font-bold border border-rose-100 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <X className="h-4 w-4" />
                    Cancel Scan
                  </button>
                </div>
              )}

              {/* Loading / Connecting State */}
              {(loading || sessionStatus === 'accepted') && !sessionRequest && (
                <div className="py-24 text-center space-y-6 relative z-10">
                  <div className="relative mx-auto w-24 h-24">
                    <div className="absolute inset-0 qr-glow-ping rounded-full animate-ping opacity-25" />
                    <div className="relative w-24 h-24 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-lg border border-slate-100 dark:border-slate-700">
                      <Loader className="h-10 w-10 animate-spin" style={{ color: 'var(--primary-color)' }} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Connecting...</h3>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Looking up patient records</p>
                  </div>
                </div>
              )}

              {/* Waiting for Patient Approval */}
              {(sessionRequest || sessionStatus === 'pending') && sessionStatus !== 'accepted' && sessionStatus !== 'declined' && (
                <div className="py-14 text-center space-y-8 relative z-10 animate-in zoom-in-95 duration-500">
                  <div className="mx-auto w-28 h-28 rounded-[32px] flex items-center justify-center qr-icon-bg border qr-primary-border">
                    <Mail className="h-12 w-12 animate-bounce" style={{ color: 'var(--primary-color)' }} />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">Waiting for Patient</h3>
                    <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-sm mx-auto">
                      A request has been sent to the patient's device. Waiting for their approval to continue.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full qr-pending-ring">
                    <Loader className="h-4 w-4 animate-spin" style={{ color: 'var(--primary-color)' }} />
                    <span className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--primary-color)' }}>Waiting for Response</span>
                  </div>
                  <button
                    onClick={resetScanner}
                    className="block w-fit mx-auto text-sm font-semibold text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    Cancel Request
                  </button>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="py-12 text-center space-y-6 relative z-10 animate-in fade-in duration-500">
                  <div className="mx-auto w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-[24px] flex items-center justify-center border border-rose-100 dark:border-rose-800/30">
                    <AlertCircle className="h-10 w-10 text-rose-500" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Access Error</h3>
                    <p className="text-rose-500/80 font-semibold px-6 text-sm leading-relaxed">{error}</p>
                  </div>
                  <div className="space-y-3 max-w-xs mx-auto">
                    {error.includes('already have a') && error.includes('accepted') ? (
                      <button
                        onClick={() => {
                          const lastP = JSON.parse(localStorage.getItem('lastScannedPatient') || '{}');
                          if (lastP.id) navigate(`/patient-details/${lastP.id}`);
                          else resetScanner();
                        }}
                        className="qr-primary-btn w-full py-4 rounded-[16px] font-bold"
                      >
                        Go to Patient Details
                      </button>
                    ) : null}
                    <button
                      onClick={resetScanner}
                      className="qr-primary-btn w-full py-4 rounded-[16px] font-bold hover:shadow-lg hover:scale-[1.01] transition-all text-sm doctor-focus-ring"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* How it Works — left column, below scanner */}
            <div className="qr-glass-card rounded-[24px] p-5 lg:p-6">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">How it Works</h3>
              <ul className="grid grid-cols-2 gap-3">
                {[
                  { icon: Camera, text: 'Click "Start Scan"', sub: 'Open camera' },
                  { icon: QrCode, text: 'Point at QR Code', sub: 'Frame the patient QR' },
                  { icon: Mail, text: 'Or Enter Manually', sub: 'Paste the token' },
                  { icon: CheckCircle, text: 'Records Load', sub: 'Approved automatically' }
                ].map((step, i) => (
                  <li key={i} className="flex gap-2.5 items-start">
                    <div className="p-1.5 qr-icon-bg rounded-lg shrink-0 mt-0.5">
                      <step.icon className="h-3.5 w-3.5" style={{ color: 'var(--primary-color)' }} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-white leading-snug">{step.text}</p>
                      <p className="text-[10px] text-slate-400 font-medium leading-snug">{step.sub}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-5">

            {/* Manual Entry Card */}
            <div className="qr-glass-card rounded-[24px] p-6 lg:p-7">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 qr-icon-bg rounded-xl shrink-0">
                  <Mail className="h-5 w-5" style={{ color: 'var(--primary-color)' }} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-none">Enter Manually</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Paste or type the patient's QR token</p>
                </div>
              </div>
              <form onSubmit={handleManualQRSubmit} className="space-y-4">
                <input
                  type="text"
                  value={manualQRCode}
                  onChange={(e) => setManualQRCode(e.target.value)}
                  placeholder="Enter QR URL or token here..."
                  className="qr-input w-full px-4 py-3.5 border border-slate-200 dark:border-slate-700 rounded-[14px] bg-slate-50 dark:bg-slate-900 text-sm font-medium outline-none dark:text-white transition-all placeholder:text-slate-400 doctor-focus-ring"
                />
                <button
                  type="submit"
                  disabled={!manualQRCode.trim() || loading}
                  className="qr-primary-btn w-full py-3.5 rounded-[14px] font-bold text-sm"
                >
                  Check QR Code
                </button>
              </form>
            </div>
            {/* Scanning Tips Card */}
            <div className="qr-glass-card rounded-[24px] p-5 lg:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 qr-icon-bg rounded-xl shrink-0">
                  <Lightbulb className="h-4 w-4" style={{ color: 'var(--primary-color)' }} />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Scanning Tips</h3>
              </div>
              <ul className="space-y-3">
                {[
                  { tip: 'Ensure good lighting on the QR code', icon: '💡' },
                  { tip: 'Hold the camera steady and close', icon: '📷' },
                  { tip: 'Centre the QR code in the frame', icon: '🎯' },
                  { tip: 'Clean the camera lens if blurry', icon: '✨' },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-base leading-none mt-0.5">{item.icon}</span>
                    <p className="text-[12px] text-slate-600 dark:text-slate-400 font-medium leading-snug">{item.tip}</p>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
