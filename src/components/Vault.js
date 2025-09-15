import { useEffect, useState } from "react";
import axios from "axios";
import Footer from "./Footer";

const Vault = () => {
  const [docs, setDocs] = useState([]);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);

  // Fetch docs from MongoDB
  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/documents");
      setDocs(res.data);
    } catch (err) {
      console.error("Error fetching documents:", err);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !title) return alert("Please enter a title and select a file");

    const formData = new FormData();
    formData.append("title", title);
    formData.append("file", file);

    try {
      await axios.post("http://localhost:5000/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setTitle("");
      setFile(null);
      fetchDocs(); // Refresh list
    } catch (err) {
      console.error("Upload error:", err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gray-50 dark:bg-gray-900">
      <div className="p-6 flex-grow max-w-5xl mx-auto w-full">
        <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          My Vault
        </h1>

        {/* Upload Form */}
        <form 
          onSubmit={handleUpload} 
          className="bg-white dark:bg-gray-900 shadow-md rounded-xl p-6 mb-8"
        >
          <input
            type="text"
            placeholder="Document Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border border-gray-300 dark:border-gray-700 p-2 rounded w-full mb-4 bg-transparent"
          />
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            className="mb-4"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Upload
          </button>
        </form>

        {/* Documents List */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {docs.map((doc) => (
            <div
              key={doc._id}
              className="bg-white dark:bg-gray-900 rounded-xl shadow p-4"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {doc.title}
              </h3>
              <a
                href={`http://localhost:5000${doc.fileUrl}`}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 dark:text-blue-400 underline mt-2 block"
              >
                Open File
              </a>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {new Date(doc.uploadedAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Vault;
