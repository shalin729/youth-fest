"use client";
import { useState } from "react";

interface Registration {
  _id: string;
  regId: string;
  name: string;
  mobile: string;
  email: string;
  village: string;
  district: string;
  mandal: string;
  paymentMethod: string;
  paymentStatus: string;
  txnId: string;
  amount: number;
  createdAt: string;
}

interface Stats {
  total: number;
  paid: number;
  pending: number;
  online: number;
  cash: number;
  totalAmount: number;
}

export default function AdminPage() {
  const [password, setPassword]           = useState("");
  const [authed, setAuthed]               = useState(false);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [stats, setStats]                 = useState<Stats | null>(null);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState("");
  const [search, setSearch]               = useState("");
  const [filter, setFilter]               = useState("all");
  const [updating, setUpdating]           = useState<string | null>(null);

  const login = async () => {
    setLoading(true); setError("");
    try {
      const res  = await fetch(`/api/registrations?password=${password}`);
      const data = await res.json();
      if (!res.ok) { setError("Wrong password"); return; }
      setRegistrations(data.registrations);
      setStats(data.stats);
      setAuthed(true);
    } catch { setError("Connection error"); }
    finally { setLoading(false); }
  };

  const refresh = async () => {
    const res  = await fetch(`/api/registrations?password=${password}`);
    const data = await res.json();
    setRegistrations(data.registrations);
    setStats(data.stats);
  };

  const markPaid = async (regId: string) => {
    setUpdating(regId);
    await fetch(`/api/registrations?password=${password}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regId, paymentStatus: "paid" }),
    });
    await refresh();
    setUpdating(null);
  };

  const filtered = registrations.filter(r => {
    const matchFilter = filter === "all" || r.paymentStatus === filter || r.paymentMethod === filter;
    const matchSearch = !search || [r.name, r.mobile, r.village, r.mandal, r.regId]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()));
    return matchFilter && matchSearch;
  });

  if (!authed) {
    return (
      <div style={styles.loginPage}>
        <div style={styles.loginCard}>
          <div style={{fontSize:"2.5rem",textAlign:"center",marginBottom:"8px"}}>🔐</div>
          <h2 style={styles.loginTitle}>Admin Dashboard</h2>
          <p style={styles.loginSub}>YouthFest Registrations</p>
          <input style={styles.loginInput} type="password" placeholder="Enter admin password"
            value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && login()}/>
          {error && <div style={styles.loginErr}>{error}</div>}
          <button style={styles.loginBtn} onClick={login} disabled={loading}>
            {loading ? "Checking..." : "Login →"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.adminPage}>
      {/* Header */}
      <div style={styles.adminHeader}>
        <div>
          <h1 style={{fontSize:"1.3rem",fontWeight:800,color:"#fff"}}>📋 Admin Dashboard</h1>
          <p style={{color:"rgba(255,255,255,0.8)",fontSize:"0.8rem"}}>YouthFest Registrations</p>
        </div>
        <button style={styles.refreshBtn} onClick={refresh}>🔄 Refresh</button>
      </div>

      {/* Stats */}
      {stats && (
        <div style={styles.statsGrid}>
          {[
            { label:"Total", value: stats.total, icon:"👥", color:"#FF6B00" },
            { label:"Paid",  value: stats.paid,  icon:"✅", color:"#2E7D32" },
            { label:"Pending",value:stats.pending,icon:"⏳", color:"#F57C00" },
            { label:"Amount",value:`₹${stats.totalAmount}`,icon:"💰",color:"#1565C0"},
          ].map(s => (
            <div key={s.label} style={styles.statCard}>
              <div style={{fontSize:"1.6rem"}}>{s.icon}</div>
              <div style={{fontSize:"1.4rem",fontWeight:800,color:s.color}}>{s.value}</div>
              <div style={{fontSize:"0.72rem",color:"#8B6540"}}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={styles.filterBar}>
        <input style={styles.searchInput} placeholder="🔍 Search name, mobile, village..." value={search}
          onChange={e => setSearch(e.target.value)}/>
        <select style={styles.filterSelect} value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="online">Online</option>
          <option value="cash">Cash</option>
        </select>
      </div>

      {/* Table */}
      <div style={styles.tableWrap}>
        <div style={{padding:"10px 14px",fontSize:"0.78rem",color:"#8B6540",fontWeight:600}}>
          Showing {filtered.length} of {registrations.length} registrations
        </div>
        {filtered.map(r => (
          <div key={r._id} style={styles.regRow}>
            <div style={styles.regTop}>
              <div>
                <span style={styles.regIdBadge}>{r.regId}</span>
                <strong style={{fontSize:"0.95rem",color:"#2D1B00"}}>{r.name}</strong>
              </div>
              <span style={{...styles.statusBadge, background: r.paymentStatus === "paid" ? "#E8F5E9" : "#FFF3E0",
                color: r.paymentStatus === "paid" ? "#2E7D32" : "#E65100"}}>
                {r.paymentStatus === "paid" ? "✅ Paid" : "⏳ Pending"}
              </span>
            </div>
            <div style={styles.regMeta}>
              <span>📱 {r.mobile}</span>
              <span>🗺️ {r.district}</span>
              <span>🏘️ {r.village}, {r.mandal}</span>
              <span>💳 {r.paymentMethod === "online" ? `Online` : "Cash"}</span>
              {r.txnId && <span style={{fontSize:"0.7rem",color:"#8B6540"}}>TXN: {r.txnId}</span>}
              <span style={{fontSize:"0.7rem",color:"#8B6540"}}>
                {new Date(r.createdAt).toLocaleString("en-IN",{timeZone:"Asia/Kolkata",dateStyle:"short",timeStyle:"short"})}
              </span>
            </div>
            {r.paymentStatus === "pending" && r.paymentMethod === "cash" && (
              <button style={styles.markPaidBtn} onClick={() => markPaid(r.regId)} disabled={updating === r.regId}>
                {updating === r.regId ? "Updating..." : "Mark as Paid ✓"}
              </button>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{textAlign:"center",padding:"40px",color:"#8B6540"}}>No registrations found</div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loginPage: { minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" },
  loginCard: { background:"#fff", borderRadius:"20px", padding:"36px 28px", maxWidth:"360px", width:"100%",
    boxShadow:"0 8px 40px rgba(45,27,0,0.12)", border:"1px solid #E8C87A" },
  loginTitle: { textAlign:"center", fontSize:"1.3rem", fontWeight:800, color:"#2D1B00", marginBottom:"4px" },
  loginSub: { textAlign:"center", fontSize:"0.8rem", color:"#8B6540", marginBottom:"24px" },
  loginInput: { width:"100%", padding:"12px 14px", border:"1.5px solid #E8C87A", borderRadius:"10px",
    fontSize:"0.9rem", fontFamily:"Poppins,sans-serif", outline:"none", marginBottom:"8px" },
  loginErr: { color:"#e53935", fontSize:"0.78rem", marginBottom:"10px", textAlign:"center" },
  loginBtn: { width:"100%", padding:"13px", background:"linear-gradient(135deg,#FF6B00,#E85D00)", color:"#fff",
    border:"none", borderRadius:"12px", fontWeight:700, fontSize:"0.95rem", cursor:"pointer", fontFamily:"Poppins,sans-serif" },

  adminPage: { maxWidth:"800px", margin:"0 auto", padding:"0 0 40px" },
  adminHeader: { background:"linear-gradient(135deg,#FF6B00,#C94E00)", padding:"20px 20px", display:"flex",
    alignItems:"center", justifyContent:"space-between" },
  refreshBtn: { background:"rgba(255,255,255,0.2)", border:"1px solid rgba(255,255,255,0.4)", color:"#fff",
    padding:"8px 16px", borderRadius:"8px", cursor:"pointer", fontSize:"0.82rem", fontFamily:"Poppins,sans-serif" },

  statsGrid: { display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:"10px", padding:"16px 14px" },
  statCard: { background:"#fff", borderRadius:"14px", padding:"16px 10px", textAlign:"center",
    border:"1px solid #E8C87A", boxShadow:"0 2px 10px rgba(45,27,0,0.06)" },

  filterBar: { display:"flex", gap:"10px", padding:"0 14px 14px", flexWrap:"wrap" },
  searchInput: { flex:1, minWidth:"180px", padding:"10px 14px", border:"1.5px solid #E8C87A", borderRadius:"10px",
    fontSize:"0.85rem", fontFamily:"Poppins,sans-serif", outline:"none" },
  filterSelect: { padding:"10px 12px", border:"1.5px solid #E8C87A", borderRadius:"10px",
    fontSize:"0.85rem", fontFamily:"Poppins,sans-serif", outline:"none", background:"#fff" },

  tableWrap: { margin:"0 14px", background:"#fff", borderRadius:"16px", border:"1px solid #E8C87A",
    overflow:"hidden", boxShadow:"0 4px 20px rgba(45,27,0,0.07)" },
  regRow: { padding:"14px 16px", borderBottom:"1px solid #FFF3E0" },
  regTop: { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"6px" },
  regIdBadge: { background:"#FFF3E0", color:"#FF6B00", fontSize:"0.68rem", fontWeight:700,
    padding:"2px 8px", borderRadius:"6px", marginRight:"8px" },
  statusBadge: { fontSize:"0.72rem", fontWeight:700, padding:"3px 10px", borderRadius:"20px" },
  regMeta: { display:"flex", flexWrap:"wrap", gap:"10px", fontSize:"0.78rem", color:"#8B6540" },
  markPaidBtn: { marginTop:"8px", padding:"6px 14px", background:"#E8F5E9", color:"#2E7D32",
    border:"1.5px solid #A5D6A7", borderRadius:"8px", fontSize:"0.78rem", fontWeight:600,
    cursor:"pointer", fontFamily:"Poppins,sans-serif" },
};
