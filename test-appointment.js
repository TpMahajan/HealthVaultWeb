// Test script to debug appointment creation
// Run this in browser console on the PatientDetails page

async function testAppointmentCreation() {
  console.log('🧪 Testing Appointment Creation...');
  
  // Get token
  const token = localStorage.getItem('token');
  console.log('🔑 Token present:', token ? 'Yes' : 'No');
  
  if (!token) {
    console.error('❌ No authentication token found');
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
    reason: "Test appointment creation",
    appointmentType: "consultation",
    notes: "This is a test appointment"
  };
  
  console.log('📤 Sending test data:', testData);
  
  try {
    const response = await fetch('https://backend-medicalvault.onrender.com/api/appointments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    console.log('📥 Response status:', response.status);
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📥 Response body:', responseText);
    
    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        console.log('✅ Success:', data);
      } catch (e) {
        console.error('❌ Failed to parse JSON:', e);
      }
    } else {
      console.error('❌ Request failed with status:', response.status);
    }
    
  } catch (error) {
    console.error('❌ Network error:', error);
  }
}

// Run the test
testAppointmentCreation();
