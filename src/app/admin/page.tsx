"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Stats {
  total: number;
  paid: number;
  pending: number;
  online: number;
  cash: number;
  totalAmount: number;
}

interface FieldConfig {
  enabled: boolean;
  required: boolean;
  label: string;
}

interface CustomField {
  id: string;
  enabled: boolean;
  required: boolean;
  label: string;
  type: string;
  options?: string[];
}

interface SettingsData {
  onlineFee: number;
  cashFee: number;
  allowedPaymentMethods?: string[];
  registrationsOpen: boolean;
  formTitle: string;
  personalInfoHeading: string;
  locationDetailsHeading: string;
  paymentMethodHeading: string;
  registrationFeeLabel: string;
  mandaliOptions: string[];
  fieldsConfig: {
    email: FieldConfig;
    district: FieldConfig;
    village: FieldConfig;
    mandali: FieldConfig;
  };
  customFields: CustomField[];
}

export default function AdminPage() {
  const [stats, setStats]                 = useState<Stats | null>(null);
  const [settings, setSettings]           = useState<SettingsData | null>(null);
  const [loading, setLoading]             = useState(true);
  const [suggestedMandalis, setSuggestedMandalis] = useState<string[]>([]);
  const [newMandali, setNewMandali]       = useState("");
  
  // Settings editing state
  const [editSettings, setEditSettings]   = useState<SettingsData | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const router = useRouter();

  useEffect(() => {
    refresh();
  }, []);

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin-login");
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/registrations?showDeleted=false`);
      if (res.status === 401) {
        router.push("/admin-login");
        return;
      }
      const data = await res.json();
      if (data.stats) setStats(data.stats);

      const settingsRes = await fetch(`/api/settings`);
      const settingsData = await settingsRes.json();
      setSettings(settingsData.settings);
      setEditSettings(settingsData.settings);
      setSuggestedMandalis(settingsData.suggestedMandalis || []);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!editSettings) return;
    setSavingSettings(true);
    try {
      await fetch(`/api/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editSettings),
      });
      await refresh();
    } finally {
      setSavingSettings(false);
    }
  };

  const togglePaymentMethod = (method: string, checked: boolean) => {
    if (!editSettings) return;
    const methods = editSettings.allowedPaymentMethods || ["online", "cash"];
    const newMethods = checked ? [...methods, method] : methods.filter(m => m !== method);
    setEditSettings({ ...editSettings, allowedPaymentMethods: newMethods.length > 0 ? newMethods : ["online"] });
  };

  const updateFieldConfig = (key: keyof SettingsData['fieldsConfig'], field: Partial<FieldConfig>) => {
    if (!editSettings) return;
    setEditSettings({
      ...editSettings,
      fieldsConfig: {
        ...editSettings.fieldsConfig,
        [key]: { ...editSettings.fieldsConfig[key], ...field }
      }
    });
  };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background-color: #F9FAFB; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; overflow-x: hidden; }
        .page-container { max-width: 1200px; margin: 0 auto; padding: 24px 16px; width: 100%; }
        
        .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
        .title { font-size: 1.5rem; font-weight: 700; color: #111827; margin: 0; }
        .subtitle { font-size: 0.875rem; color: #6B7280; margin: 4px 0 0; }
        
        .btn { display: inline-flex; align-items: center; justify-content: center; padding: 8px 16px; border-radius: 6px; font-weight: 500; font-size: 0.875rem; cursor: pointer; transition: all 0.2s; border: none; text-decoration: none; }
        .btn-primary { background: #0F172A; color: white; }
        .btn-primary:hover { background: #1E293B; }
        .btn-outline { background: white; border: 1px solid #D1D5DB; color: #374151; }
        .btn-outline:hover { background: #F3F4F6; }
        
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .stat-card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06); border: 1px solid #E5E7EB; border-top: 4px solid #3B82F6; }
        .stat-card:nth-child(2) { border-top-color: #10B981; }
        .stat-card:nth-child(3) { border-top-color: #F59E0B; }
        .stat-card:nth-child(4) { border-top-color: #8B5CF6; }
        .stat-label { font-size: 0.75rem; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
        .stat-value { font-size: 1.875rem; font-weight: 700; color: #111827; }
        
        .section-card { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06); border: 1px solid #E5E7EB; margin-bottom: 24px; }
        .section-title { font-size: 1.125rem; font-weight: 600; color: #111827; margin: 0 0 16px; padding-bottom: 12px; border-bottom: 1px solid #E5E7EB; }
        
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
        @media (max-width: 768px) { .form-grid { grid-template-columns: 1fr; } }
        
        .form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; width: 100%; }
        .form-label { font-size: 0.875rem; font-weight: 600; color: #374151; }
        .form-input { width: 100%; padding: 10px 14px; border: 1px solid #D1D5DB; border-radius: 6px; font-size: 0.875rem; outline: none; transition: all 0.2s; }
        .form-input:focus { border-color: #3B82F6; box-shadow: 0 0 0 2px rgba(59,130,246,0.1); }
        
        .core-fields-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 16px; background: #F9FAFB; border-radius: 8px; border: 1px solid #E5E7EB; margin-bottom: 24px; }
        @media (max-width: 640px) { .core-fields-grid { grid-template-columns: 1fr; } }
        .field-card { background: white; padding: 16px; border-radius: 8px; border: 1px solid #E5E7EB; }
      `}</style>

      <div className="page-container">
        <div className="header">
          <div>
            <h1 className="title">Admin Dashboard</h1>
            <p className="subtitle">YouthFest Event Management & Settings</p>
          </div>
          <div style={{display:"flex", gap:"12px", flexWrap:"wrap"}}>
            <Link href="/admin/registrations" className="btn btn-primary">
              View Registrations →
            </Link>
            <button className="btn btn-outline" onClick={logout}>Logout</button>
          </div>
        </div>

        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total Registrations</div>
              <div className="stat-value">{stats.total}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Paid Registrations</div>
              <div className="stat-value">{stats.paid}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Pending Payments</div>
              <div className="stat-value">{stats.pending}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Revenue</div>
              <div className="stat-value">₹{stats.totalAmount}</div>
            </div>
          </div>
        )}

        {editSettings && (
          <div className="section-card">
            <h2 className="section-title">Form Builder & Event Settings</h2>
            
            <div className="form-grid">
              <div>
                <h3 style={{fontSize:"1rem", fontWeight:600, color:"#111827", marginBottom:"16px"}}>General Settings</h3>
                
                <div style={{display:"flex", alignItems:"center", gap:"12px", marginBottom:"16px", padding:"12px", background:"#F9FAFB", borderRadius:"6px", border:"1px solid #E5E7EB"}}>
                  <input type="checkbox" id="regOpen" checked={editSettings.registrationsOpen} 
                    onChange={e => setEditSettings({...editSettings, registrationsOpen: e.target.checked})} style={{width:"16px", height:"16px"}} />
                  <label htmlFor="regOpen" className="form-label" style={{margin:0, cursor:"pointer"}}>Accepting New Registrations</label>
                </div>

                <div className="form-group">
                  <label className="form-label">Event Title</label>
                  <input className="form-input" value={editSettings.formTitle} 
                    onChange={e => setEditSettings({...editSettings, formTitle: e.target.value})} />
                </div>

                <div style={{display:"flex", gap:"16px", marginBottom:"16px"}}>
                  <div className="form-group" style={{flex:1, marginBottom:0}}>
                    <label className="form-label">Online Fee (₹)</label>
                    <input type="number" className="form-input" value={editSettings.onlineFee} 
                      onChange={e => setEditSettings({...editSettings, onlineFee: Number(e.target.value)})} />
                  </div>
                  <div className="form-group" style={{flex:1, marginBottom:0}}>
                    <label className="form-label">Cash Fee (₹)</label>
                    <input type="number" className="form-input" value={editSettings.cashFee} 
                      onChange={e => setEditSettings({...editSettings, cashFee: Number(e.target.value)})} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Allowed Payment Methods</label>
                  <div style={{display:"flex", gap:"16px", padding:"12px", background:"#F9FAFB", borderRadius:"6px", border:"1px solid #E5E7EB"}}>
                    <label style={{display:"flex", alignItems:"center", gap:"8px", fontSize:"0.875rem"}}>
                      <input type="checkbox" checked={(editSettings.allowedPaymentMethods || ["online","cash"]).includes("online")} 
                        onChange={e => togglePaymentMethod("online", e.target.checked)} />
                      Online (UPI)
                    </label>
                    <label style={{display:"flex", alignItems:"center", gap:"8px", fontSize:"0.875rem"}}>
                      <input type="checkbox" checked={(editSettings.allowedPaymentMethods || ["online","cash"]).includes("cash")} 
                        onChange={e => togglePaymentMethod("cash", e.target.checked)} />
                      Cash at Venue
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <h3 style={{fontSize:"1rem", fontWeight:600, color:"#111827", marginBottom:"16px"}}>Form Section Headings</h3>
                <div className="form-group">
                  <label className="form-label">Personal Info Heading</label>
                  <input className="form-input" value={editSettings.personalInfoHeading} 
                    onChange={e => setEditSettings({...editSettings, personalInfoHeading: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Location Details Heading</label>
                  <input className="form-input" value={editSettings.locationDetailsHeading} 
                    onChange={e => setEditSettings({...editSettings, locationDetailsHeading: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Heading</label>
                  <input className="form-input" value={editSettings.paymentMethodHeading} 
                    onChange={e => setEditSettings({...editSettings, paymentMethodHeading: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Registration Fee Label</label>
                  <input className="form-input" value={editSettings.registrationFeeLabel || "Registration Fee:"} 
                    onChange={e => setEditSettings({...editSettings, registrationFeeLabel: e.target.value})} />
                </div>
              </div>
            </div>

            <h3 style={{fontSize:"1rem", fontWeight:600, color:"#111827", marginBottom:"12px"}}>Core Form Fields Configuration</h3>
            <div className="core-fields-grid">
              {(['email', 'district', 'village', 'mandali'] as const).map(key => (
                <div key={key} className="field-card">
                  <div style={{display:"flex", justifyContent:"space-between", marginBottom:"12px"}}>
                    <strong style={{fontSize:"0.875rem", textTransform:"capitalize", color:"#111827"}}>{key}</strong>
                    <div style={{display:"flex", gap:"12px", fontSize:"0.75rem"}}>
                      <label style={{display:"flex", alignItems:"center", gap:"4px"}}>
                        <input type="checkbox" checked={editSettings.fieldsConfig[key].enabled} onChange={e => updateFieldConfig(key, { enabled: e.target.checked })} /> Show
                      </label>
                      <label style={{display:"flex", alignItems:"center", gap:"4px"}}>
                        <input type="checkbox" checked={editSettings.fieldsConfig[key].required} onChange={e => updateFieldConfig(key, { required: e.target.checked })} /> Required
                      </label>
                    </div>
                  </div>
                  <input className="form-input" style={{width:"100%"}} placeholder="Custom Label (e.g. Email ID)" 
                    value={editSettings.fieldsConfig[key].label} onChange={e => updateFieldConfig(key, { label: e.target.value })} />
                </div>
              ))}
            </div>
            
            <div style={{display:"flex", justifyContent:"flex-end", marginTop:"24px", paddingTop:"16px", borderTop:"1px solid #E5E7EB"}}>
              <button className="btn btn-primary" onClick={saveSettings} disabled={savingSettings}>
                {savingSettings ? "Saving Settings..." : "Save Settings"}
              </button>
            </div>
            
            {/*
            <h3 style={{fontSize:"1rem", fontWeight:600, color:"#111827", marginTop:"32px", marginBottom:"12px"}}>Mandali Options Manager</h3>
            <div style={{background: "#F9FAFB", padding: "20px", borderRadius: "12px", border: "1px solid #E5E7EB", marginBottom: "24px"}}>
              <div style={{marginBottom: "20px"}}>
                <label className="form-label">Official Mandali Options</label>
                <p style={{fontSize: "0.8rem", color: "#6B7280", margin: "4px 0 12px"}}>These options will appear in the autocomplete dropdown for users.</p>
                <div style={{display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px"}}>
                  {(editSettings.mandaliOptions || []).map(m => (
                    <div key={m} style={{background: "#DBEAFE", color: "#1E40AF", padding: "6px 14px", borderRadius: "20px", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "8px", fontWeight: 500}}>
                      {m}
                      <button style={{padding: 0, color: "#1E3A8A", background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem", lineHeight: 1}} 
                        onClick={() => setEditSettings({...editSettings, mandaliOptions: editSettings.mandaliOptions.filter(opt => opt !== m)})}>
                        ×
                      </button>
                    </div>
                  ))}
                  {(editSettings.mandaliOptions || []).length === 0 && <span style={{fontSize: "0.875rem", color: "#6B7280"}}>No options added yet.</span>}
                </div>
                
                <div style={{display: "flex", gap: "12px"}}>
                  <input className="form-input" placeholder="Type a new Mandali..." style={{flex: 1}} 
                    value={newMandali}
                    onChange={e => setNewMandali(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = newMandali.trim();
                        if (val && !(editSettings.mandaliOptions || []).includes(val)) {
                          setEditSettings({...editSettings, mandaliOptions: [...(editSettings.mandaliOptions || []), val]});
                          setNewMandali("");
                        }
                      }
                    }}
                  />
                  <button className="btn btn-primary" onClick={() => {
                    const val = newMandali.trim();
                    if (val && !(editSettings.mandaliOptions || []).includes(val)) {
                      setEditSettings({...editSettings, mandaliOptions: [...(editSettings.mandaliOptions || []), val]});
                      setNewMandali("");
                    }
                  }}>Add to List</button>
                </div>
              </div>

              {suggestedMandalis.filter(m => !(editSettings.mandaliOptions || []).includes(m)).length > 0 && (
                <div style={{borderTop: "1px solid #E5E7EB", paddingTop: "20px"}}>
                  <label className="form-label">Suggestions from Users</label>
                  <p style={{fontSize: "0.8rem", color: "#6B7280", margin: "4px 0 12px"}}>These are Mandalis typed by users that are not in your official list. Click one to add it.</p>
                  <div style={{display: "flex", flexWrap: "wrap", gap: "8px"}}>
                    {suggestedMandalis.filter(m => !(editSettings.mandaliOptions || []).includes(m)).map(m => (
                      <button key={m} className="btn" style={{background: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A", padding: "6px 14px", borderRadius: "20px", fontSize: "0.875rem", fontWeight: 500, boxShadow: "0 1px 2px rgba(0,0,0,0.05)"}}
                        onClick={() => setEditSettings({...editSettings, mandaliOptions: [...(editSettings.mandaliOptions || []), m]})}>
                        + Add "{m}"
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            */}
            
          </div>
        )}
      </div>
    </>
  );
}
