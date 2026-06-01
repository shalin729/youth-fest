"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Registration {
  _id: string;
  regId: string;
  name: string;
  mobile: string;
  email: string;
  village: string;
  district: string;
  mandali: string;
  paymentMethod: string;
  paymentStatus: string;
  txnId: string;
  amount: number;
  createdAt: string;
  isDeleted?: boolean;
}

export default function RegistrationsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading]             = useState(false);
  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState("all");
  const [methodFilter, setMethodFilter]   = useState("all");
  const [updating, setUpdating]           = useState<string | null>(null);
  
  const [viewTrash, setViewTrash]         = useState(false);
  const [showModal, setShowModal]         = useState<"add" | "edit" | null>(null);
  const [modalData, setModalData]         = useState<Partial<Registration>>({});
  
  const router = useRouter();

  useEffect(() => {
    refresh();
  }, []);

  const refresh = async (trashState = viewTrash) => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/registrations?showDeleted=${trashState}`);
      if (res.status === 401) {
        router.push("/admin-login");
        return;
      }
      const data = await res.json();
      setRegistrations(data.registrations || []);
    } finally {
      setLoading(false);
    }
  };

  const markPaid = async (regId: string) => {
    setUpdating(regId);
    await fetch(`/api/registrations`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regId, paymentStatus: "paid" }),
    });
    await refresh();
    setUpdating(null);
  };

  const deleteReg = async (regId: string) => {
    if (!confirm("Are you sure you want to delete this registration?")) return;
    setUpdating(regId);
    await fetch(`/api/registrations?regId=${regId}`, { method: "DELETE" });
    await refresh();
    setUpdating(null);
  };

  const saveModal = async () => {
    setUpdating("modal");
    const method = showModal === "add" ? "POST" : "PATCH";
    await fetch(`/api/registrations`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(modalData),
    });
    setShowModal(null);
    await refresh();
    setUpdating(null);
  };

  const filtered = registrations.filter(r => {
    if (viewTrash && !r.isDeleted) return false;
    if (!viewTrash && r.isDeleted) return false;
    const matchStatus = statusFilter === "all" || r.paymentStatus === statusFilter;
    const matchMethod = methodFilter === "all" || r.paymentMethod === methodFilter;
    const matchSearch = !search || [r.name, r.mobile, r.village, r.mandali, r.regId]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()));
    return matchStatus && matchMethod && matchSearch;
  });

  const exportToCSV = () => {
    if (filtered.length === 0) return alert("No data to export!");
    const headers = ["Reg ID", "Name", "Mobile", "Email", "District", "Mandali", "Village", "Amount", "Payment Method", "Payment Status", "Transaction ID", "Date"];
    const rows = filtered.map(r => [
      r.regId,
      `"${r.name}"`,
      r.mobile,
      r.email || "",
      r.district === "N/A" ? "" : `"${r.district}"`,
      r.mandali === "N/A" ? "" : `"${r.mandali}"`,
      r.village === "N/A" ? "" : `"${r.village}"`,
      r.amount || 0,
      r.paymentMethod,
      r.paymentStatus,
      r.txnId || "",
      new Date(r.createdAt).toLocaleString("en-IN")
    ]);
    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `youthfest_registrations_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <style>{`
        body { margin: 0; background-color: #F9FAFB; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
        .page-container { max-width: 1200px; margin: 0 auto; padding: 24px 16px; }
        .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
        .title { font-size: 1.5rem; font-weight: 700; color: #111827; margin: 0; }
        .subtitle { font-size: 0.875rem; color: #6B7280; margin: 4px 0 0; }
        
        .btn { display: inline-flex; align-items: center; justify-content: center; padding: 8px 16px; border-radius: 6px; font-weight: 500; font-size: 0.875rem; cursor: pointer; transition: all 0.2s; border: none; text-decoration: none; }
        .btn-primary { background: #0F172A; color: white; }
        .btn-primary:hover { background: #1E293B; }
        .btn-outline { background: white; border: 1px solid #D1D5DB; color: #374151; }
        .btn-outline:hover { background: #F3F4F6; }
        .btn-danger { background: white; border: 1px solid #FCA5A5; color: #DC2626; }
        .btn-danger:hover { background: #FEF2F2; }
        
        .card-wrap { background: white; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06); border: 1px solid #E5E7EB; overflow: hidden; }
        
        .toolbar { display: flex; gap: 12px; padding: 16px; border-bottom: 1px solid #E5E7EB; flex-wrap: wrap; background: #FAFAFA; }
        .search-input { flex: 1; min-width: 200px; padding: 10px 14px; border: 1px solid #D1D5DB; border-radius: 6px; font-size: 0.875rem; outline: none; }
        .search-input:focus { border-color: #3B82F6; box-shadow: 0 0 0 2px rgba(59,130,246,0.1); }
        .filter-select { 
          padding: 10px 36px 10px 14px; 
          border: 1px solid #D1D5DB; 
          border-radius: 6px; 
          font-size: 0.875rem; 
          background: white url('data:image/svg+xml;charset=US-ASCII,<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="%23374151" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>') no-repeat right 12px center; 
          appearance: none; 
          -webkit-appearance: none; 
          outline: none; 
          cursor: pointer;
          color: #374151;
          transition: all 0.2s;
        }
        .filter-select:hover { border-color: #9CA3AF; }
        .filter-select:focus { border-color: #3B82F6; box-shadow: 0 0 0 2px rgba(59,130,246,0.1); }
        
        /* Desktop Table View */
        .table-view { width: 100%; border-collapse: collapse; }
        .table-view th { text-align: left; padding: 12px 16px; font-size: 0.75rem; text-transform: uppercase; color: #6B7280; border-bottom: 1px solid #E5E7EB; font-weight: 600; background: #F9FAFB; }
        .table-view td { padding: 16px; border-bottom: 1px solid #E5E7EB; font-size: 0.875rem; color: #111827; vertical-align: top; }
        .table-view tr:last-child td { border-bottom: none; }
        
        /* Mobile Card View */
        .mobile-view { display: none; padding: 16px; gap: 16px; flex-direction: column; }
        .mobile-card { background: white; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .mc-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
        .mc-title { font-weight: 600; font-size: 1rem; color: #111827; }
        .mc-id { font-size: 0.75rem; color: #6B7280; font-family: monospace; background: #F3F4F6; padding: 2px 6px; border-radius: 4px; margin-top: 4px; display: inline-block; }
        .mc-meta { display: grid; grid-template-columns: 1fr; gap: 8px; font-size: 0.875rem; color: #4B5563; margin-bottom: 16px; }
        .mc-meta-row { display: flex; gap: 8px; align-items: center; }
        .mc-actions { display: flex; gap: 8px; flex-wrap: wrap; border-top: 1px solid #F3F4F6; padding-top: 12px; }
        
        .badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 999px; font-size: 0.75rem; font-weight: 500; }
        .badge-success { background: #DCFCE7; color: #166534; }
        .badge-warning { background: #FEF9C3; color: #854D0E; }
        .badge-gray { background: #F3F4F6; color: #374151; }

        @media (max-width: 768px) {
          .table-view { display: none; }
          .mobile-view { display: flex; }
        }
        
        /* Modal */
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(17,24,39,0.7); display: flex; align-items: center; justify-content: center; z-index: 999; padding: 16px; }
        .modal-content { background: white; border-radius: 12px; width: 100%; max-width: 500px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); overflow: hidden; }
        .modal-header { padding: 20px 24px; border-bottom: 1px solid #E5E7EB; }
        .modal-header h3 { margin: 0; font-size: 1.25rem; font-weight: 600; color: #111827; }
        .modal-body { padding: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 500px) { .modal-body { grid-template-columns: 1fr; } }
        .modal-footer { padding: 16px 24px; background: #F9FAFB; border-top: 1px solid #E5E7EB; display: flex; justify-content: flex-end; gap: 12px; }
        
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .form-label { font-size: 0.75rem; font-weight: 600; color: #374151; }
      `}</style>

      <div className="page-container">
        <div className="header">
          <div>
            <div style={{display:"flex", alignItems:"center", gap:"12px"}}>
              <Link href="/admin" className="btn btn-outline" style={{padding:"6px 10px"}}>← Dashboard</Link>
              <h1 className="title">Registrations</h1>
            </div>
            <p className="subtitle">Manage all event participants and payments.</p>
          </div>
          <div style={{display:"flex", gap:"12px", flexWrap:"wrap"}}>

            <button className="btn btn-outline" onClick={() => refresh()}>Refresh</button>
            <button className="btn btn-outline" style={{borderColor: '#10B981', color: '#047857'}} onClick={exportToCSV}>
              Export CSV
            </button>
            <button className="btn btn-primary" onClick={() => { setShowModal("add"); setModalData({ paymentMethod: "cash", paymentStatus: "paid" }); }}>
              + Add New
            </button>
          </div>
        </div>

        <div className="card-wrap">
          <div className="toolbar">
            <input className="search-input" placeholder="Search name, mobile, village..." value={search} onChange={e => setSearch(e.target.value)} />
            <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="paid">Paid Only</option>
              <option value="pending">Pending Only</option>
            </select>
            <select className="filter-select" value={methodFilter} onChange={e => setMethodFilter(e.target.value)}>
              <option value="all">All Methods</option>
              <option value="online">Online Method</option>
              <option value="cash">Cash Method</option>
            </select>
          </div>

          <div style={{padding:"12px 16px", fontSize:"0.8rem", color:"#6B7280", borderBottom:"1px solid #E5E7EB"}}>
            {loading ? "Loading..." : `Showing ${filtered.length} of ${registrations.length} total entries`}
          </div>

          {/* Desktop View */}
          <table className="table-view">
            <thead>
              <tr>
                <th>Participant</th>
                <th>Contact</th>
                <th>Location</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r._id}>
                  <td>
                    <div style={{fontWeight:500}}>{r.name}</div>
                    <div style={{fontSize:"0.75rem", color:"#6B7280", fontFamily:"monospace", marginTop:"4px"}}>{r.regId}</div>
                  </td>
                  <td>
                    <div>{r.mobile}</div>
                    {r.email && <div style={{fontSize:"0.8rem", color:"#6B7280"}}>{r.email}</div>}
                  </td>
                  <td>
                    <div>{[r.village, r.mandali].filter(x => x && x !== "N/A").join(", ")}</div>
                    <div style={{fontSize:"0.8rem", color:"#6B7280"}}>{r.district !== "N/A" ? r.district : ""}</div>
                  </td>
                  <td>
                    <div style={{fontWeight: 600, color: "#111827"}}>₹{r.amount || 0}</div>
                  </td>
                  <td>
                    <div style={{display:"flex", gap:"8px", alignItems:"center", marginBottom:"4px"}}>
                      <span className={`badge ${r.paymentStatus === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                        {r.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                      </span>
                      <span className="badge badge-gray">{r.paymentMethod === 'online' ? 'Online' : 'Cash'}</span>
                    </div>
                    {r.txnId && <div style={{fontSize:"0.75rem", color:"#6B7280"}}>TXN: {r.txnId}</div>}
                    <div style={{fontSize:"0.75rem", color:"#6B7280"}}>{new Date(r.createdAt).toLocaleDateString("en-IN")}</div>
                  </td>
                  <td>
                    <div style={{display:"flex", gap:"8px", flexWrap:"wrap"}}>
                      {r.paymentStatus === "pending" && r.paymentMethod === "cash" && !viewTrash && (
                        <button className="btn btn-outline" style={{padding:"4px 10px", fontSize:"0.75rem"}} onClick={() => markPaid(r.regId)} disabled={updating === r.regId}>
                          {updating === r.regId ? "..." : "Mark Paid"}
                        </button>
                      )}
                      {!viewTrash && (
                        <>
                          <button className="btn btn-outline" style={{padding:"4px 10px", fontSize:"0.75rem"}} onClick={() => { setShowModal("edit"); setModalData(r); }}>
                            Edit
                          </button>
                          {r.paymentStatus !== "paid" && (
                            <button className="btn btn-danger" style={{padding:"4px 10px", fontSize:"0.75rem"}} onClick={() => deleteReg(r.regId)} disabled={updating === r.regId}>
                              {updating === r.regId ? "..." : "Delete"}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} style={{textAlign:"center", padding:"48px", color:"#6B7280"}}>No registrations found matching your criteria.</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Mobile View */}
          <div className="mobile-view">
            {filtered.map(r => (
              <div key={r._id} className="mobile-card">
                <div className="mc-header">
                  <div>
                    <div className="mc-title">{r.name}</div>
                    <div className="mc-id">{r.regId}</div>
                  </div>
                  <span className={`badge ${r.paymentStatus === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                    {r.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                  </span>
                </div>
                
                <div className="mc-meta">
                  <div className="mc-meta-row"><span style={{width:"20px"}}>📞</span> {r.mobile}</div>
                  {r.email && <div className="mc-meta-row"><span style={{width:"20px"}}>✉️</span> {r.email}</div>}
                  <div className="mc-meta-row"><span style={{width:"20px"}}>📍</span> {[r.village, r.mandali, r.district !== "N/A" ? `(${r.district})` : null].filter(x => x && x !== "N/A").join(" ")}</div>
                  <div className="mc-meta-row"><span style={{width:"20px"}}>💰</span> ₹{r.amount || 0}</div>
                  <div className="mc-meta-row"><span style={{width:"20px"}}>💳</span> {r.paymentMethod === 'online' ? 'Online' : 'Cash'} {r.txnId ? `• ${r.txnId}` : ''}</div>
                </div>

                <div className="mc-actions">
                  {r.paymentStatus === "pending" && r.paymentMethod === "cash" && !viewTrash && (
                    <button className="btn btn-outline" style={{padding:"6px 12px"}} onClick={() => markPaid(r.regId)} disabled={updating === r.regId}>
                      {updating === r.regId ? "..." : "Mark Paid"}
                    </button>
                  )}
                  {!viewTrash && (
                    <>
                      <button className="btn btn-outline" style={{padding:"6px 12px"}} onClick={() => { setShowModal("edit"); setModalData(r); }}>
                        Edit
                      </button>
                      {r.paymentStatus !== "paid" && (
                        <button className="btn btn-danger" style={{padding:"6px 12px"}} onClick={() => deleteReg(r.regId)} disabled={updating === r.regId}>
                          Delete
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
            {filtered.length === 0 && !loading && (
              <div style={{textAlign:"center", padding:"32px", color:"#6B7280"}}>No registrations found.</div>
            )}
          </div>

        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{showModal === "add" ? "Add New Registration" : "Edit Registration"}</h3>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="search-input" value={modalData.name || ""} onChange={e => setModalData({...modalData, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Mobile</label>
                <input className="search-input" value={modalData.mobile || ""} onChange={e => setModalData({...modalData, mobile: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="search-input" value={modalData.email || ""} onChange={e => setModalData({...modalData, email: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">District</label>
                <input className="search-input" value={modalData.district || ""} onChange={e => setModalData({...modalData, district: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Mandali</label>
                <input className="search-input" value={modalData.mandali || ""} onChange={e => setModalData({...modalData, mandali: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Village</label>
                <input className="search-input" value={modalData.village || ""} onChange={e => setModalData({...modalData, village: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select className="filter-select" value={modalData.paymentMethod || "cash"} onChange={e => setModalData({...modalData, paymentMethod: e.target.value})}>
                  <option value="cash">Cash</option>
                  <option value="online">Online</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Payment Status</label>
                <select className="filter-select" value={modalData.paymentStatus || "pending"} onChange={e => setModalData({...modalData, paymentStatus: e.target.value})}>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveModal} disabled={updating === "modal"}>
                {updating === "modal" ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
