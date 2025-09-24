# 🔍 Appointment Debug Guide

## 🧪 **Step-by-Step Debugging:**

### **Step 1: Test in Browser Console**
1. **Open PatientDetails page** with a patient loaded
2. **Open Developer Tools** (F12)
3. **Go to Console tab**
4. **Copy and paste this code**:

```javascript
// Test appointment creation
async function testAppointment() {
  console.log('🧪 Testing appointment creation...');
  
  // Check if we have a patient
  console.log('👤 Current patient:', window.patient || 'Not found');
  
  // Get token
  const token = localStorage.getItem('token');
  console.log('🔑 Token:', token ? 'Present' : 'Missing');
  
  if (!token) {
    console.error('❌ No token found');
    return;
  }
  
  // Test data
  const testData = {
    patientId: "68cbc774016915954c5e14d1",
    patientName: "Test Patient",
    patientEmail: "test@example.com",
    patientPhone: "1234567890",
    appointmentDate: "2024-01-20",
    appointmentTime: "14:30",
    duration: 30,
    reason: "Test appointment",
    appointmentType: "consultation",
    notes: "Test notes"
  };
  
  try {
    console.log('📤 Sending request...');
    const response = await fetch('https://backend-medicalvault.onrender.com/api/appointments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    console.log('📥 Response:', {
      status: response.status,
      ok: response.ok,
      statusText: response.statusText
    });
    
    const responseText = await response.text();
    console.log('📥 Response body:', responseText);
    
    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('✅ Success:', data);
    } else {
      console.error('❌ Failed:', response.status, responseText);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the test
testAppointment();
```

### **Step 2: Check Network Tab**
1. **Go to Network tab** in Developer Tools
2. **Try to create an appointment** through the UI
3. **Look for POST request** to `/api/appointments`
4. **Check the request details**:
   - Request payload
   - Response status
   - Response body

### **Step 3: Check Console Logs**
When you try to create an appointment, you should see these logs:
```
🔍 AppointmentModal Debug:
Patient object: {...}
Patient ID: 68cbc774016915954c5e14d1
Appointment data: {...}
Auth token present: Yes
🚀 Sending appointment request to: https://backend-medicalvault.onrender.com/api/appointments
📤 Request payload: {...}
📥 Appointment creation response: {...}
```

## 🚨 **Common Issues & Solutions:**

### **Issue 1: 401 Unauthorized**
**Symptoms:** Response status 401
**Causes:**
- Invalid or expired token
- Token not being sent correctly
- Backend authentication issue

**Solutions:**
```javascript
// Check token format
const token = localStorage.getItem('token');
console.log('Token format:', token ? token.substring(0, 20) + '...' : 'Missing');

// Try logging out and back in
localStorage.removeItem('token');
// Then log in again
```

### **Issue 2: 400 Bad Request**
**Symptoms:** Response status 400
**Causes:**
- Missing required fields
- Invalid data format
- Patient ID issues

**Solutions:**
```javascript
// Check if all required fields are present
const requiredFields = ['patientId', 'patientName', 'appointmentDate', 'appointmentTime', 'reason'];
requiredFields.forEach(field => {
  console.log(`${field}:`, appointmentData[field] || 'MISSING');
});
```

### **Issue 3: 500 Server Error**
**Symptoms:** Response status 500
**Causes:**
- Backend server issues
- Database connection problems
- Server-side validation errors

**Solutions:**
- Check if backend server is running
- Verify database connection
- Check server logs

### **Issue 4: Network Error**
**Symptoms:** Fetch fails with network error
**Causes:**
- Backend server down
- Network connectivity issues
- CORS issues

**Solutions:**
```javascript
// Test backend connectivity
fetch('https://backend-medicalvault.onrender.com/api/appointments')
  .then(res => console.log('Backend reachable:', res.status))
  .catch(err => console.error('Backend unreachable:', err));
```

## 🔧 **Backend Verification:**

### **Test Backend Endpoint:**
```javascript
// Test if appointments endpoint exists
fetch('https://backend-medicalvault.onrender.com/api/appointments', {
  method: 'OPTIONS'
})
.then(res => console.log('Endpoint exists:', res.status))
.catch(err => console.error('Endpoint error:', err));
```

### **Check Authentication:**
```javascript
// Test authentication
fetch('https://backend-medicalvault.onrender.com/api/doctors/me', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})
.then(res => res.json())
.then(data => console.log('Auth test:', data))
.catch(err => console.error('Auth error:', err));
```

## 📋 **Debug Checklist:**

- [ ] **Token Present**: Check if authentication token exists
- [ ] **Token Valid**: Verify token is not expired
- [ ] **Patient Data**: Confirm patient object has correct ID
- [ ] **Required Fields**: Ensure all required fields are filled
- [ ] **Backend Reachable**: Test if backend server is accessible
- [ ] **Network Request**: Check if POST request is being sent
- [ ] **Response Status**: Verify response status code
- [ ] **Response Body**: Check response content

## 🚀 **Next Steps:**

1. **Run the test script** above in browser console
2. **Check the console output** for any errors
3. **Report the specific error messages** you see
4. **Check the Network tab** for failed requests

This will help identify exactly where the issue is occurring!
