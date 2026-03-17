import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Eye, 
  FileText, 
  FileImage, 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Loader
} from 'lucide-react';

const MedicalRecordsModal = ({ isOpen, onClose, patient, records }) => {
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(null);

  if (!isOpen) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case 'reviewed':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-800';
      case 'active':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'reviewed':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'active':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-500" />;
      case 'image':
        return <FileImage className="h-5 w-5 text-blue-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const handlePreview = async (record) => {
    setPreviewLoading(true);
    setSelectedRecord(record);
    
    // Simulate loading time
    setTimeout(() => {
      setPreviewLoading(false);
    }, 1000);
  };

  const handleDownload = async (record) => {
    setDownloadLoading(record.id);
    
    try {
      // Simulate download process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create a mock download
      const blob = new Blob(['Mock file content'], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${record.title}.${record.fileType}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setDownloadLoading(null);
    }
  };

  const handleBulkDownload = async () => {
    setDownloadLoading('bulk');
    
    try {
      // Simulate bulk download process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Create a zip-like download simulation
      const blob = new Blob(['Mock zip file content'], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${patient.name}_Medical_Records.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      console.error('Bulk download failed:', error);
    } finally {
      setDownloadLoading(null);
    }
  };

  const renderPreview = () => {
    if (!selectedRecord) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              {getFileIcon(selectedRecord.fileType)}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {selectedRecord.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedRecord.type} • {selectedRecord.size}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedRecord(null)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          
          <div className="p-6 h-96 overflow-auto">
            {previewLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-300">Loading preview...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedRecord.fileType === 'pdf' ? (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center">
                    <FileText className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      PDF Document Preview
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      This is a preview of the PDF document. Click download to get the full file.
                    </p>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                      <p className="text-sm text-gray-700 dark:text-gray-300 text-left">
                        <strong>Document Type:</strong> {selectedRecord.type}<br/>
                        <strong>Date:</strong> {new Date(selectedRecord.date).toLocaleDateString()}<br/>
                        <strong>Status:</strong> {selectedRecord.status}<br/>
                        <strong>File Size:</strong> {selectedRecord.size}
                      </p>
                    </div>
                  </div>
                ) : selectedRecord.fileType === 'image' ? (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center">
                    <FileImage className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Image Preview
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      This is a preview of the medical image. Click download to get the full file.
                    </p>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                      <p className="text-sm text-gray-700 dark:text-gray-300 text-left">
                        <strong>Image Type:</strong> {selectedRecord.type}<br/>
                        <strong>Date:</strong> {new Date(selectedRecord.date).toLocaleDateString()}<br/>
                        <strong>Status:</strong> {selectedRecord.status}<br/>
                        <strong>File Size:</strong> {selectedRecord.size}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center">
                    <FileText className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Document Preview
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      This is a preview of the document. Click download to get the full file.
                    </p>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                      <p className="text-sm text-gray-700 dark:text-gray-300 text-left">
                        <strong>Document Type:</strong> {selectedRecord.type}<br/>
                        <strong>Date:</strong> {new Date(selectedRecord.date).toLocaleDateString()}<br/>
                        <strong>Status:</strong> {selectedRecord.status}<br/>
                        <strong>File Size:</strong> {selectedRecord.size}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <Calendar className="h-4 w-4" />
              <span>Created: {new Date(selectedRecord.date).toLocaleDateString()}</span>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => handleDownload(selectedRecord)}
                disabled={downloadLoading === selectedRecord.id}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {downloadLoading === selectedRecord.id ? (
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download
              </button>
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                {patient.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Medical Records
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {patient.name} • {records.length} records
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleBulkDownload}
                disabled={downloadLoading === 'bulk'}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {downloadLoading === 'bulk' ? (
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download All
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Records List */}
          <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {getFileIcon(record.fileType)}
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                          {record.title}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {record.type}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(record.status)}`}>
                      <span className="flex items-center space-x-1">
                        {getStatusIcon(record.status)}
                        <span>{record.status}</span>
                      </span>
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date(record.date).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Size: {record.size}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handlePreview(record)}
                      className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Preview
                    </button>
                    <button
                      onClick={() => handleDownload(record)}
                      disabled={downloadLoading === record.id}
                      className="flex-1 flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {downloadLoading === record.id ? (
                        <Loader className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Download className="h-3 w-3 mr-1" />
                      )}
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {records.length === 0 && (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  No medical records found
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  This patient doesn't have any medical records yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {renderPreview()}
    </>
  );
};

export default MedicalRecordsModal;
