import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { API_BASE, getAuthHeadersMultipart } from "../constants/api";
import Footer from "./Footer";

const Vault = () => {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [groupedDocs, setGroupedDocs] = useState({});
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState("Other");

  // Fetch docs from MongoDB
  useEffect(() => {
    if (user?.id) {
      fetchDocs();
      fetchGroupedDocs();
    }
  }, [user]);

  const fetchDocs = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/files/patient/${user.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
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
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/files/patient/${user.id}/grouped`, {
        headers: { 'Authorization': `Bearer ${token}` }
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
    if (!file || !title) return alert("Please enter a title and select a file");

    const formData = new FormData();
    formData.append("title", title);
    formData.append("file", file);
    formData.append("category", category);
    formData.append("patientId", user.id);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/files/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      const data = await res.json();
      if (data.success) {
        setTitle("");
        setFile(null);
        setCategory("Other");
        fetchDocs(); // Refresh list
        fetchGroupedDocs(); // Refresh grouped
      } else {
        alert("Upload failed: " + data.msg);
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed: " + err.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      <div className="p-6 flex-grow max-w-5xl mx-auto w-full">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white" style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif", fontWeight: 700 }}>
          My Vault
        </h1>

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
            className="border border-gray-300 dark:border-gray-600 p-2.5 rounded-lg w-full mb-4 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif", fontWeight: 400 }}
            required
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 p-2.5 rounded-lg w-full mb-4 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif", fontWeight: 400 }}
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
            onChange={(e) => setFile(e.target.files[0])}
            className="mb-4"
            required
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Upload
          </button>
        </form>

        {/* Grouped Documents */}
        <div className="space-y-6">
          {Object.entries(groupedDocs).map(([category, docs]) => (
            docs.length > 0 && (
              <div key={category} className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-xl shadow-sm border border-white/50 dark:border-gray-700/50 p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 capitalize" style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif", fontWeight: 600 }}>
                  {category} ({docs.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {docs.map((doc) => (
                    <div
                      key={doc._id}
                      className="border border-gray-200/50 dark:border-gray-700/50 rounded-lg p-4 hover:shadow-md transition-shadow bg-white/50 dark:bg-gray-700/50"
                    >
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2" style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif", fontWeight: 600 }}>
                        {doc.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2" style={{ fontFamily: "'Josefin Sans', system-ui, sans-serif", fontWeight: 400 }}>
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
                        {new Date(doc.uploadedAt || doc.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      </div>

      {/* Footer */}
      <Footer whiteText />
    </div>
  );
};

export default Vault;
