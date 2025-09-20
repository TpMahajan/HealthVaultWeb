import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const generatePatientSummaryPDF = async (patient, documents = [], appointments = []) => {
  try {
    // Create new PDF document
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 20;

    // Helper function to add text with word wrapping
    const addText = (text, x, y, maxWidth, fontSize = 12, color = '#000000') => {
      pdf.setFontSize(fontSize);
      pdf.setTextColor(color);
      const lines = pdf.splitTextToSize(text, maxWidth);
      pdf.text(lines, x, y);
      return y + (lines.length * fontSize * 0.4);
    };

    // Helper function to add a new page if needed
    const checkNewPage = (requiredSpace) => {
      if (yPosition + requiredSpace > pageHeight - 20) {
        pdf.addPage();
        yPosition = 20;
        return true;
      }
      return false;
    };

    // Header
    pdf.setFillColor(41, 128, 185);
    pdf.rect(0, 0, pageWidth, 30, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('HealthVault - Patient Summary', 20, 20);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth - 80, 20);
    
    yPosition = 40;

    // Patient Information Section
    pdf.setFillColor(240, 248, 255);
    pdf.rect(10, yPosition - 5, pageWidth - 20, 15, 'F');
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Patient Information', 15, yPosition);
    yPosition += 20;

    // Patient Details
    const patientInfo = [
      `Name: ${patient.name}`,
      `Patient ID: ${patient.patientId}`,
      `Age: ${patient.age || 'N/A'} years`,
      `Gender: ${patient.gender || 'N/A'}`,
      `Date of Birth: ${patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : 'N/A'}`,
      `Blood Type: ${patient.bloodType || 'N/A'}`,
      `Email: ${patient.email || 'N/A'}`,
      `Phone: ${patient.mobile || 'N/A'}`
    ];

    patientInfo.forEach(info => {
      checkNewPage(10);
      yPosition = addText(info, 15, yPosition, pageWidth - 30, 10);
      yPosition += 5;
    });

    yPosition += 10;

    // Medical History Section
    if (patient.medicalHistory && patient.medicalHistory.length > 0) {
      checkNewPage(20);
      pdf.setFillColor(240, 248, 255);
      pdf.rect(10, yPosition - 5, pageWidth - 20, 15, 'F');
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Medical History', 15, yPosition);
      yPosition += 20;

      patient.medicalHistory.forEach(condition => {
        checkNewPage(15);
        const conditionText = `${condition.condition} (Diagnosed: ${condition.diagnosed}, Status: ${condition.status})`;
        yPosition = addText(conditionText, 15, yPosition, pageWidth - 30, 10);
        yPosition += 8;
      });

      yPosition += 10;
    }

    // Current Medications Section
    if (patient.medications && patient.medications.length > 0) {
      checkNewPage(20);
      pdf.setFillColor(240, 248, 255);
      pdf.rect(10, yPosition - 5, pageWidth - 20, 15, 'F');
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Current Medications', 15, yPosition);
      yPosition += 20;

      patient.medications.forEach(med => {
        checkNewPage(15);
        const medText = `${med.name} - ${med.dosage} (${med.frequency}) - Prescribed: ${med.prescribed}`;
        yPosition = addText(medText, 15, yPosition, pageWidth - 30, 10);
        yPosition += 8;
      });

      yPosition += 10;
    }

    // Medical Records Section
    if (documents && documents.length > 0) {
      checkNewPage(20);
      pdf.setFillColor(240, 248, 255);
      pdf.rect(10, yPosition - 5, pageWidth - 20, 15, 'F');
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Medical Records', 15, yPosition);
      yPosition += 20;

      documents.forEach(doc => {
        checkNewPage(15);
        const docText = `${doc.title} (${doc.type}) - ${doc.status} - Uploaded: ${new Date(doc.uploadedAt).toLocaleDateString()}`;
        yPosition = addText(docText, 15, yPosition, pageWidth - 30, 10);
        yPosition += 8;
      });

      yPosition += 10;
    }

    // Recent Appointments Section
    if (appointments && appointments.length > 0) {
      checkNewPage(20);
      pdf.setFillColor(240, 248, 255);
      pdf.rect(10, yPosition - 5, pageWidth - 20, 15, 'F');
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Recent Appointments', 15, yPosition);
      yPosition += 20;

      appointments.slice(0, 5).forEach(appointment => {
        checkNewPage(15);
        const appointmentText = `${new Date(appointment.appointmentDate).toLocaleDateString()} at ${appointment.appointmentTime} - ${appointment.reason} (${appointment.status})`;
        yPosition = addText(appointmentText, 15, yPosition, pageWidth - 30, 10);
        yPosition += 8;
      });

      yPosition += 10;
    }

    // Summary Section
    checkNewPage(30);
    pdf.setFillColor(240, 248, 255);
    pdf.rect(10, yPosition - 5, pageWidth - 20, 15, 'F');
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Summary', 15, yPosition);
    yPosition += 20;

    const summaryText = `This patient summary was generated on ${new Date().toLocaleDateString()} and contains the most recent medical information available. For the most up-to-date information, please refer to the patient's electronic health record system.`;
    yPosition = addText(summaryText, 15, yPosition, pageWidth - 30, 10);

    // Footer
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.text('Generated by HealthVault - Secure Medical Records Management', pageWidth / 2, pageHeight - 10, { align: 'center' });

    // Generate filename
    const filename = `${patient.name.replace(/\s+/g, '_')}_Summary_${new Date().toISOString().split('T')[0]}.pdf`;

    // Save the PDF
    pdf.save(filename);

    return { success: true, filename };

  } catch (error) {
    console.error('Error generating PDF:', error);
    return { success: false, error: error.message };
  }
};

export const generateAppointmentPDF = async (appointment) => {
  try {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 20;

    // Helper function to add text
    const addText = (text, x, y, maxWidth, fontSize = 12, color = '#000000') => {
      pdf.setFontSize(fontSize);
      pdf.setTextColor(color);
      const lines = pdf.splitTextToSize(text, maxWidth);
      pdf.text(lines, x, y);
      return y + (lines.length * fontSize * 0.4);
    };

    // Header
    pdf.setFillColor(34, 139, 34);
    pdf.rect(0, 0, pageWidth, 30, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Appointment Confirmation', 20, 20);
    
    yPosition = 40;

    // Appointment Details
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('Appointment Details', 15, yPosition);
    yPosition += 20;

    const appointmentDetails = [
      `Patient: ${appointment.patientName}`,
      `Date: ${new Date(appointment.appointmentDate).toLocaleDateString()}`,
      `Time: ${appointment.appointmentTime}`,
      `Duration: ${appointment.duration} minutes`,
      `Type: ${appointment.appointmentType}`,
      `Reason: ${appointment.reason}`,
      `Status: ${appointment.status}`
    ];

    appointmentDetails.forEach(detail => {
      yPosition = addText(detail, 15, yPosition, pageWidth - 30, 12);
      yPosition += 8;
    });

    if (appointment.notes) {
      yPosition += 10;
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Notes:', 15, yPosition);
      yPosition += 10;
      yPosition = addText(appointment.notes, 15, yPosition, pageWidth - 30, 10);
    }

    // Footer
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.text('Generated by HealthVault', pageWidth / 2, pageHeight - 10, { align: 'center' });

    const filename = `Appointment_${appointment.patientName.replace(/\s+/g, '_')}_${new Date(appointment.appointmentDate).toISOString().split('T')[0]}.pdf`;
    pdf.save(filename);

    return { success: true, filename };

  } catch (error) {
    console.error('Error generating appointment PDF:', error);
    return { success: false, error: error.message };
  }
};


