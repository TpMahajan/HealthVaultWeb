import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { API_BASE, getAuthHeadersMultipart } from "../constants/api";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

const getUploadErrorMessage = (payload = {}, status) => {
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

const Vault = () => {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [groupedDocs, setGroupedDocs] = useState({});
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState("Other");
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);

  // Fetch docs from MongoDB
  useEffect(() => {
    if (user?.id) {
      fetchDocs();
      fetchGroupedDocs();
    }
  }, [user]);

  const fetchDocs = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/files/patient/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setDocs(data.documents || []);
      }
    } catch (err) {
      console.error("Error fetching documents:", err);
    }
  };

  const fetchGroupedDocs = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/files/patient/${user.id}/grouped`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setGroupedDocs(data.records || {});
      }
    } catch (err) {
      console.error("Error fetching grouped documents:", err);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (uploading) return;
    setUploadError("");

    const patientId = String(user?.id || user?._id || "").trim();
    if (!patientId) {
      setUploadError("Patient information is missing");
      return;
    }
    if (!file || !title.trim()) {
      setUploadError("Please enter a title and select a file");
      return;
    }
    if (!ALLOWED_UPLOAD_MIME_TYPES.has(file.type)) {
      setUploadError("Unsupported file type");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError("File too large");
      return;
    }

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("file", file);
    formData.append("category", category);
    formData.append("patientId", patientId);

    try {
      setUploading(true);
      const res = await fetch(`${API_BASE}/files/upload`, {
        method: "POST",
        headers: getAuthHeadersMultipart(),
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setTitle("");
        setFile(null);
        setCategory("Other");
        fetchDocs(); // Refresh list
        fetchGroupedDocs(); // Refresh grouped
      } else {
        setUploadError(getUploadErrorMessage(data, res.status));
      }
    } catch (err) {
      console.error("Upload error:", err);
      setUploadError("Network error");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e) => {
    const nextFile = e.target.files?.[0] || null;
    setUploadError("");
    if (!nextFile) {
      setFile(null);
      return;
    }
    if (!ALLOWED_UPLOAD_MIME_TYPES.has(nextFile.type)) {
      setFile(null);
      e.target.value = "";
      setUploadError("Unsupported file type");
      return;
    }
    if (nextFile.size > MAX_UPLOAD_BYTES) {
      setFile(null);
      e.target.value = "";
      setUploadError("File too large");
      return;
    }
    setFile(nextFile);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <div className="p-6 flex-grow max-w-5xl mx-auto w-full">
        {/* Page title is now in GlobalNavbar */}

        {/* Upload Form */}
        <form
          onSubmit={handleUpload}
          className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md shadow-sm border border-white/50 dark:border-gray-700/50 rounded-xl p-6 mb-8"
        >
          <input
            type="text"
            placeholder="Document Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 p-2.5 rounded-full w-full mb-4 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-900 dark:text-gray-100 doctor-focus-ring"
            style={{
              fontFamily: "'Josefin Sans', system-ui, sans-serif",
              fontWeight: 400,
            }}
            required
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 p-2.5 rounded-full w-full mb-4 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-900 dark:text-gray-100 doctor-focus-ring"
            style={{
              fontFamily: "'Josefin Sans', system-ui, sans-serif",
              fontWeight: 400,
            }}
          >
            <option value="Lab Report">Lab Report</option>
            <option value="Imaging">Imaging</option>
            <option value="Prescription">Prescription</option>
            <option value="Bill">Bill</option>
            <option value="Insurance">Insurance</option>
            <option value="Other">Other</option>
          </select>
          <input
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.jpg,.jpeg,.png"
            className="mb-4"
            required
          />
          {uploadError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
              {uploadError}
            </div>
          )}
          <button
            type="submit"
            disabled={uploading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </form>

        {/* Grouped Documents */}
        <div className="space-y-6">
          {Object.entries(groupedDocs).map(
            ([category, docs]) =>
              docs.length > 0 && (
                <div
                  key={category}
                  className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-xl shadow-sm border border-white/50 dark:border-gray-700/50 p-6"
                >
                  <h2
                    className="text-xl font-semibold text-gray-900 dark:text-white mb-4 capitalize"
                    style={{
                      fontFamily: "'Josefin Sans', system-ui, sans-serif",
                      fontWeight: 600,
                    }}
                  >
                    {category} ({docs.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {docs.map((doc) => (
                      <div
                        key={doc._id}
                        className="border border-gray-200/50 dark:border-gray-700/50 rounded-lg p-4 hover:shadow-md transition-shadow bg-white/50 dark:bg-gray-700/50"
                      >
                        <h3
                          className="text-lg font-medium text-gray-900 dark:text-white mb-2"
                          style={{
                            fontFamily: "'Josefin Sans', system-ui, sans-serif",
                            fontWeight: 600,
                          }}
                        >
                          {doc.title}
                        </h3>
                        <p
                          className="text-sm text-gray-500 dark:text-gray-400 mb-2"
                          style={{
                            fontFamily: "'Josefin Sans', system-ui, sans-serif",
                            fontWeight: 400,
                          }}
                        >
                          Type: {doc.type}
                        </p>
                        <div className="flex space-x-2">
                          <a
                            href={`${API_BASE}/files/${doc._id}/preview`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 dark:text-blue-400 text-sm hover:underline"
                          >
                            Preview
                          </a>
                          <a
                            href={`${API_BASE}/files/${doc._id}/download`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-green-600 dark:text-green-400 text-sm hover:underline"
                          >
                            Download
                          </a>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          {new Date(
                            doc.uploadedAt || doc.createdAt,
                          ).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ),
          )}
        </div>
      </div>
    </div>
  );
};

export default Vault;
