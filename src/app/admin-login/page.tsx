"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const router = useRouter();

  const login = async () => {
    setLoading(true); 
    setError("");
    try {
      const loginRes = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const loginData = await loginRes.json();
      
      if (!loginRes.ok) {
        setError(loginData.error || "Login failed");
        return;
      }
      
      // Successfully logged in (cookie is set)
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.loginPage}>
      <div style={styles.loginCard}>
        <div style={{fontSize:"2.5rem",textAlign:"center",marginBottom:"8px"}}>🔐</div>
        <h2 style={styles.loginTitle}>Admin Dashboard</h2>
        <p style={styles.loginSub}>YouthFest Registrations</p>
        <input style={styles.loginInput} type="text" placeholder="Admin Username"
          value={username} onChange={e => setUsername(e.target.value)} />
        <input style={styles.loginInput} type="password" placeholder="Admin Password"
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

const styles: Record<string, React.CSSProperties> = {
  loginPage: { minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px", background: "#fdf8f5" },
  loginCard: { background:"#fff", borderRadius:"20px", padding:"36px 28px", maxWidth:"360px", width:"100%",
    boxShadow:"0 8px 40px rgba(45,27,0,0.12)", border:"1px solid #E8C87A" },
  loginTitle: { textAlign:"center", fontSize:"1.3rem", fontWeight:800, color:"#2D1B00", marginBottom:"4px" },
  loginSub: { textAlign:"center", fontSize:"0.8rem", color:"#8B6540", marginBottom:"24px" },
  loginInput: { width:"100%", padding:"12px 14px", border:"1.5px solid #E8C87A", borderRadius:"10px",
    fontSize:"0.9rem", fontFamily:"Poppins,sans-serif", outline:"none", marginBottom:"8px" },
  loginErr: { color:"#e53935", fontSize:"0.78rem", marginBottom:"10px", textAlign:"center" },
  loginBtn: { width:"100%", padding:"13px", background:"linear-gradient(135deg,#FF6B00,#E85D00)", color:"#fff",
    border:"none", borderRadius:"12px", fontWeight:700, fontSize:"0.95rem", cursor:"pointer", fontFamily:"Poppins,sans-serif" },
};
