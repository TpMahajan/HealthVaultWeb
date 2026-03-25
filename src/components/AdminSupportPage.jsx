import React from "react";

const AdminSupportPage = () => {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-extrabold text-slate-900">Support Tickets</h2>
      <p className="text-sm text-slate-500 mt-1">
        Ticket APIs are not configured yet. This section is role-ready for SUPPORT_ADMIN.
      </p>
      <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
        Connect your ticket endpoints (view/reply) to enable this module.
      </div>
    </div>
  );
};

export default AdminSupportPage;
