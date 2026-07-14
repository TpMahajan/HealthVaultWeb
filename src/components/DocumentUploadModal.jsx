import React, { useState } from "react";
import {
  X,
  Upload,
  FileText,
  FileImage,
  AlertCircle,
  CheckCircle,
  Loader,
} from "lucide-react";
import { API_BASE, getAuthHeadersMultipart } from "../constants/api";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

const getFriendlyUploadError = (payload = {}, status) => {
  const code = String(payload.errorCode || payload.code || payload.error || "")
    .trim()
    .toUpperCase();

  if (code === "FILE_TOO_LARGE" || status === 413) return "File too large";
  if (code === "UNSUPPORTED_FILE_TYPE") return "Unsupported file type";
  if (
    code === "LOGIN_EXPIRED" ||
    code === "AUTH_REQUIRED" ||
    code === "INVALID_TOKEN" ||
    code === "TOKEN_EXPIRED" ||
    status === 401
  ) {
    return "Login expired. Please sign in again.";
  }
  if (code === "STORAGE_NOT_CONFIGURED" || status === 503) {
    return "Storage not configured";
  }
  if (code === "MISSING_PATIENT_ID") return "Patient information is missing";

  return payload.message || payload.msg || "Upload failed, please try again";
};

const DocumentUploadModal = ({ isOpen, onClose, patient, onUploadSuccess }) => {
  const [formData, setFormData] = useState({
    title: "",
    category: "Report",
    description: "",
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const categories = [
    { value: "Report", label: "Report" },
    { value: "Prescription", label: "Prescription" },
    { value: "Bill", label: "Bill" },
    { value: "Insurance", label: "Insurance" },
  ];

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > MAX_UPLOAD_BYTES) {
        setSelectedFile(null);
        e.target.value = "";
        setError("File too large");
        return;
      }

      if (!ALLOWED_UPLOAD_MIME_TYPES.has(file.type)) {
        setSelectedFile(null);
        e.target.value = "";
        setError("Unsupported file type");
        return;
      }

      setSelectedFile(file);
      setError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (uploading) return;

    if (!selectedFile) {
      setError("Please select a file to upload");
      return;
    }

    if (!formData.title.trim()) {
      setError("Please enter a document title");
      return;
    }

    if (selectedFile.size > MAX_UPLOAD_BYTES) {
      setError("File too large");
      return;
    }

    if (!ALLOWED_UPLOAD_MIME_TYPES.has(selectedFile.type)) {
      setError("Unsupported file type");
      return;
    }

    const resolvedPatientId = String(
      patient?.id ||
        patient?._id ||
        patient?.userId ||
        patient?.patientId ||
        "",
    ).trim();

    if (!resolvedPatientId) {
      setError("Patient information is missing");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const headers = getAuthHeadersMultipart();
      if (!headers.Authorization) {
        setError("Login expired. Please sign in again.");
        setUploading(false);
        return;
      }

      const uploadData = new FormData();
      uploadData.append("file", selectedFile);
      uploadData.append("userId", resolvedPatientId);
      uploadData.append("patientId", resolvedPatientId);
      uploadData.append("title", formData.title);
      uploadData.append("category", formData.category);
      uploadData.append("notes", formData.description);
      uploadData.append("date", new Date().toISOString());

      const apiUrl = `${API_BASE}/files/upload`;
      const response = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: uploadData,
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        await response.text().catch(() => "");
        throw new Error("Upload failed, please try again");
      }

      const data = await response.json();

      if (data.success) {
        setSuccess("Document uploaded and saved successfully!");
        setFormData({ title: "", category: "Report", description: "" });
        setSelectedFile(null);

        if (onUploadSuccess) {
          onUploadSuccess(data.document || data.data);
        }

        // Close modal after 3 seconds
        setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        setError(getFriendlyUploadError(data, response.status));
      }
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Network error"
          : err.message || "Upload failed, please try again",
      );
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (file) => {
    if (!file) return <FileText className="h-8 w-8 text-gray-400" />;

    if (file.type.startsWith("image/")) {
      return <FileImage className="h-8 w-8 text-blue-500" />;
    }
    return <FileText className="h-8 w-8 text-red-500" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[95vh] flex flex-col mx-2 sm:mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm sm:text-lg flex-shrink-0">
              {patient.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 truncate">
                Upload Document
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                {patient.name} • {patient.patientId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6"
        >
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Document
            </label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 sm:p-6 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                {selectedFile ? (
                  <div className="space-y-2">
                    {getFileIcon(selectedFile)}
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      Click to change file
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        PDF, JPG, JPEG, PNG (max 50MB)
                      </p>
                    </div>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Document Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Document Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="e.g., Blood Test Results, X-Ray Report"
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 doctor-focus-ring"
              required
            />
          </div>

          {/* Document Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Document Category *
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 doctor-focus-ring"
              required
            >
              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Add any additional notes about this document..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 doctor-focus-ring"
            />
          </div>

          {/* Error/Success Messages */}
          {(error || success) && (
            <div
              className={`p-3 rounded-lg flex items-center space-x-2 ${
                error
                  ? "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
                  : "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
              }`}
            >
              {error ? (
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              )}
              <span
                className={`text-sm ${
                  error
                    ? "text-red-800 dark:text-red-200"
                    : "text-green-800 dark:text-green-200"
                }`}
              >
                {error || success}
              </span>
            </div>
          )}
        </form>

        {/* Actions - Sticky Footer */}
        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 p-4 sm:p-6 pt-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={async (e) => {
              e.preventDefault();
              await handleSubmit(e);
            }}
            disabled={uploading || !selectedFile || !formData.title.trim()}
            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            {uploading ? (
              <>
                <Loader className="h-5 w-5 mr-2 animate-spin" />
                Uploading to S3...
              </>
            ) : (
              <>
                <Upload className="h-5 w-5 mr-2" />
                Upload & Save Document
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentUploadModal;
