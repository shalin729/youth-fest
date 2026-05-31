"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import styles from "./page.module.css";
import { DISTRICTS, VILLAGES, type District } from "@/lib/villages";

type Step = 1 | 2 | 3;
type PayMethod = "online" | "cash";

interface FormData {
  name: string;
  mobile: string;
  email: string;
  district: District | "";
  village: string;
  mandali: string;
  paymentMethod: PayMethod;
  txnId: string;
  customField1?: string;
  customField2?: string;
}

interface Errors {
  name?: string;
  mobile?: string;
  email?: string;
  district?: string;
  village?: string;
  mandali?: string;
  txnId?: string;
}

// Razorpay types
declare global {
  interface Window {
    Razorpay: any;
  }
}

const EMPTY_FORM: FormData = {
  name: "", mobile: "", email: "",
  district: "", village: "", mandali: "",
  paymentMethod: "online", txnId: "",
  customField1: "", customField2: "",
};

export default function RegisterPage() {
  const [step, setStep]         = useState<Step>(1);
  const [form, setForm]         = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors]     = useState<Errors>({});
  const [regId, setRegId]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [apiError, setApiError] = useState("");
  const [settings, setSettings] = useState<any>(null);
  const [suggestedMandalis, setSuggestedMandalis] = useState<string[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Fetch fees and settings
  useEffect(() => {
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => {
        if (data.success && data.settings) {
          setSettings(data.settings);
          if (data.suggestedMandalis) {
            setSuggestedMandalis(data.suggestedMandalis);
          }
          const allowed = data.settings.allowedPaymentMethods || ["online", "cash"];
          
          // Only update payment method if we haven't loaded one from session storage
          setForm(f => {
            if (!f.paymentMethod || !allowed.includes(f.paymentMethod)) {
              return { ...f, paymentMethod: allowed[0] as PayMethod };
            }
            return f;
          });
        }
      })
      .catch(err => console.error("Failed to fetch settings", err))
      .finally(() => setLoadingSettings(false));
  }, []);

  // Load state from session storage on mount
  useEffect(() => {
    try {
      const savedStep = sessionStorage.getItem("yf_step");
      const savedForm = sessionStorage.getItem("yf_form");
      const savedRegId = sessionStorage.getItem("yf_regId");
      if (savedStep) setStep(Number(savedStep) as Step);
      if (savedForm) setForm(JSON.parse(savedForm));
      if (savedRegId) setRegId(savedRegId);
    } catch (e) {
      console.error("Failed to load session state", e);
    }
  }, []);

  // Save state to session storage
  useEffect(() => {
    sessionStorage.setItem("yf_step", step.toString());
    sessionStorage.setItem("yf_form", JSON.stringify(form));
    sessionStorage.setItem("yf_regId", regId);
  }, [step, form, regId]);

  // Mandali search state
  const [mandaliSearch, setMandaliSearch] = useState("");
  const [showMandaliList, setShowMandaliList] = useState(false);
  const mandaliRef = useRef<HTMLDivElement>(null);

  // District dropdown state
  const [showDistrictList, setShowDistrictList] = useState(false);
  const districtRef = useRef<HTMLDivElement>(null);

  // Load Razorpay checkout script once
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (mandaliRef.current && !mandaliRef.current.contains(e.target as Node))
        setShowMandaliList(false);
      if (districtRef.current && !districtRef.current.contains(e.target as Node))
        setShowDistrictList(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const mandaliList = useMemo(() => {
    const official = settings?.mandaliOptions || [];
    const all = Array.from(new Set([...official, ...suggestedMandalis]));
    const q = mandaliSearch.toLowerCase();
    return q ? all.filter((v: string) => v.toLowerCase().includes(q)) : all;
  }, [settings?.mandaliOptions, suggestedMandalis, mandaliSearch]);

  const set = (field: keyof FormData, value: string) => {
    if (field === "district") {
      setForm(f => ({ ...f, district: value as District, village: "" }));
    } else {
      setForm(f => ({ ...f, [field]: value }));
    }
    setErrors(e => ({ ...e, [field]: "" }));
  };

  const selectMandali = (v: string) => {
    setForm(f => ({ ...f, mandali: v }));
    setErrors(e => ({ ...e, mandali: "" }));
    setMandaliSearch(v);
    setShowMandaliList(false);
  };

  const validate1 = () => {
    const e: Errors = {};
    if (!form.name.trim() || form.name.trim().length < 2) e.name = "Please enter your full name";
    if (!/^[6-9]\d{9}$/.test(form.mobile)) e.mobile = "Enter valid 10-digit mobile number";
    
    if (settings?.fieldsConfig?.email?.required && (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))) e.email = "Enter valid email address";
    else if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter valid email address";

    if (settings?.fieldsConfig?.district?.required && !form.district) e.district = "Please select your district";
    if (settings?.fieldsConfig?.village?.required && !form.village.trim()) e.village = "Please enter your village name";
    if (settings?.fieldsConfig?.mandali?.required && !form.mandali.trim()) e.mandali = "Please enter your mandali name";
    
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleContinue = async () => {
    if (!validate1()) return;
    setLoading(true);
    setApiError("");
    try {
      const payload = {
        regId: regId || undefined,
        name: form.name, mobile: form.mobile, email: form.email,
        district: form.district, village: form.village, mandali: form.mandali,
        paymentMethod: form.paymentMethod
      };
      const method = regId ? "PATCH" : "POST";
      const res = await fetch("/api/register", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        setApiError(data.error || "Failed to save registration details.");
        setLoading(false);
        return;
      }
      setRegId(data.regId);
      setStep(2);
    } catch {
      setApiError("Network error while saving details.");
    } finally {
      setLoading(false);
    }
  };

  // ── Online payment via Razorpay ─────────────────────────────────────────
  const handleRazorpayPayment = async () => {
    setLoading(true);
    setApiError("");
    try {
      // 1. Create Razorpay order on server
      const orderRes  = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, mobile: form.mobile }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        setApiError(orderData.error || "Could not initiate payment. Please try again.");
        setLoading(false);
        return;
      }

      // 2. Open Razorpay checkout popup
      const options = {
        key:         orderData.keyId,
        amount:      orderData.amount,       // in paise
        currency:    orderData.currency,
        name:        settings?.formTitle || "YouthFest",
        description: `Registration • ₹${settings?.onlineFee || 10}`,
        order_id:    orderData.orderId,
        prefill: {
          name:    form.name,
          contact: form.mobile,
          email:   form.email || undefined,
        },
        theme: { color: "#FF6B00" },
        config: {
          display: {
            blocks: {
              upi: {
                name: "Pay via UPI",
                instruments: [{ method: "upi" }]
              }
            },
            sequence: ["block.upi"],
            preferences: { show_default_blocks: false }
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setApiError("Payment was cancelled. Please try again.");
          },
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          // 3. Verify payment on server and save registration
          try {
            const verifyRes  = await fetch("/api/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
                regId,
                name: form.name, mobile: form.mobile, email: form.email,
                district: form.district, village: form.village, mandali: form.mandali,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              setApiError(verifyData.error || "Payment verification failed.");
              setLoading(false);
              return;
            }
            setRegId(verifyData.regId);
            setForm(f => ({ ...f, txnId: response.razorpay_payment_id }));
            setStep(3);
          } catch {
            setApiError("Network error during verification. Contact support with your payment ID.");
          } finally {
            setLoading(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (resp: any) => {
        setApiError(`Payment failed: ${resp.error.description}`);
        setLoading(false);
      });
      rzp.open();
    } catch {
      setApiError("Could not connect. Please check your internet connection.");
      setLoading(false);
    }
  };

  // ── Cash payment (unchanged) ────────────────────────────────────────────
  const submitCash = async () => {
    setLoading(true);
    setApiError("");
    try {
      const res  = await fetch("/api/register", {
        method: regId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          regId: regId || undefined,
          name: form.name, mobile: form.mobile, email: form.email,
          district: form.district, village: form.village, mandali: form.mandali,
          paymentMethod: "cash",
          confirmCash: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setApiError(data.error || "Something went wrong. Please try again.");
        return;
      }
      setRegId(data.regId);
      setStep(3);
    } catch {
      setApiError("Network error. Please check connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  
  if (loadingSettings) {
    return <div style={{height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#8B6540"}}>Loading event details...</div>;
  }

  if (settings && settings.registrationsOpen === false) {
    return (
      <div className={styles.page}>
        <div className={styles.card} style={{textAlign: "center", padding: "40px 20px"}}>
          <div style={{fontSize: "3rem", marginBottom: "16px"}}>🔒</div>
          <h2 style={{fontSize: "1.5rem", color: "#2D1B00", marginBottom: "8px"}}>Registrations Closed</h2>
          <p style={{color: "#8B6540"}}>We are not accepting any new registrations at this time.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>

      {/* ── Steps ── */}
      <div className={styles.stepsBar}>
        {[1,2,3].map(n => (
          <div key={n} className={`${styles.stepItem} ${step === n ? styles.active : step > n ? styles.done : ""}`}>
            <div className={styles.stepCircle}>{step > n ? "✓" : n}</div>
            <div className={styles.stepLabel}>{["Details","Payment","Done"][n-1]}</div>
          </div>
        ))}
      </div>

      {/* ══ STEP 1 ══ */}
      {step === 1 && (
        <div className={styles.card}>
          <div className={styles.sectionTitle}>{settings?.personalInfoHeading || "📝 Personal Information"}</div>

          <Field label="Full Name" required error={errors.name}>
            <input placeholder="Enter your full name" value={form.name}
              onChange={e => set("name", e.target.value)} className={errors.name ? styles.inputError : ""} />
          </Field>

          <Field label="Mobile Number" required error={errors.mobile}>
            <input placeholder="10-digit mobile number" value={form.mobile} maxLength={10} inputMode="numeric"
              onChange={e => set("mobile", e.target.value.replace(/\D/g,""))} className={errors.mobile ? styles.inputError : ""}/>
          </Field>

          {settings?.fieldsConfig?.email?.enabled !== false && (
            <Field label={settings?.fieldsConfig?.email?.label || "Email ID"} required={settings?.fieldsConfig?.email?.required} error={errors.email}>
              <input type="email" placeholder="example@gmail.com (optional)" value={form.email}
                onChange={e => set("email", e.target.value)} className={errors.email ? styles.inputError : ""}/>
            </Field>
          )}

          { (settings?.fieldsConfig?.district?.enabled !== false || settings?.fieldsConfig?.village?.enabled !== false || settings?.fieldsConfig?.mandali?.enabled !== false) && (
            <div className={styles.sectionTitle} style={{marginTop:"8px"}}>{settings?.locationDetailsHeading || "📍 Location Details"}</div>
          )}

          {/* District */}
          {settings?.fieldsConfig?.district?.enabled !== false && (
            <Field label={settings?.fieldsConfig?.district?.label || "District"} required={settings?.fieldsConfig?.district?.required} error={errors.district}>
            <div ref={districtRef} style={{position:"relative"}}>
              <div 
                onClick={() => setShowDistrictList(!showDistrictList)}
                className={errors.district ? styles.inputError : ""}
                style={{
                  width:"100%", padding:"12px 36px 12px 14px", border:`1.5px solid ${errors.district ? "#e53935" : "#E8C87A"}`,
                  borderRadius:"10px", fontSize:"0.9rem", fontFamily:"inherit",
                  background:"#FFFDF5 url('data:image/svg+xml;charset=US-ASCII,<svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"%23374151\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><polyline points=\"6 9 12 15 18 9\"></polyline></svg>') no-repeat right 14px center",
                  color: form.district ? "#2D1B00" : "#aaa", cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                {form.district || "Select your district"}
              </div>
              
              {showDistrictList && (
                <div style={{
                  position:"absolute", top:"100%", left:0, right:0, zIndex:100,
                  background:"#fff", border:"1.5px solid #E8C87A", borderRadius:"12px",
                  boxShadow:"0 8px 30px rgba(45,27,0,0.15)", maxHeight:"250px",
                  overflowY:"auto", marginTop:"6px", padding:"6px 0"
                }}>
                  {DISTRICTS.map(d => (
                    <div key={d}
                      onClick={() => {
                        set("district", d);
                        setShowDistrictList(false);
                      }}
                      style={{
                        padding:"12px 16px", cursor:"pointer", fontSize:"0.9rem",
                        color: form.district === d ? "#FF6B00" : "#2D1B00",
                        fontWeight: form.district === d ? 600 : 400,
                        background: form.district === d ? "#FFF8EC" : "transparent",
                        transition:"all 0.15s"
                      }}
                      onMouseEnter={e => { if (form.district !== d) e.currentTarget.style.background = "#FFFDF5"; }}
                      onMouseLeave={e => { if (form.district !== d) e.currentTarget.style.background = "transparent"; }}
                    >
                      {d}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Field>
          )}

          {/* Village — standard text input */}
          {settings?.fieldsConfig?.village?.enabled !== false && (
          <Field label={settings?.fieldsConfig?.village?.label || "Village Name"} required={settings?.fieldsConfig?.village?.required} error={errors.village}>
              <input
                placeholder="Enter your village name"
                value={form.village}
                onChange={e => set("village", e.target.value)}
                className={errors.village ? styles.inputError : ""}
              />
          </Field>
          )}

          {/* Mandali — searchable autocomplete */}
          {settings?.fieldsConfig?.mandali?.enabled !== false && (
          <Field label={settings?.fieldsConfig?.mandali?.label || "Mandali Name"} required={settings?.fieldsConfig?.mandali?.required} error={errors.mandali}>
              <div ref={mandaliRef} style={{position:"relative"}}>
                <input
                  placeholder={`Search or enter mandali…`}
                  value={mandaliSearch || form.mandali}
                  autoComplete="off"
                  className={errors.mandali ? styles.inputError : ""}
                  onChange={e => {
                    setMandaliSearch(e.target.value);
                    setForm(f => ({ ...f, mandali: e.target.value }));
                    setErrors(er => ({ ...er, mandali: "" }));
                    setShowMandaliList(true);
                  }}
                  onFocus={() => setShowMandaliList(true)}
                />
                {showMandaliList && mandaliList.length > 0 && (
                  <div style={{
                    position:"absolute", top:"100%", left:0, right:0, zIndex:100,
                    background:"#fff", border:"1.5px solid #E8C87A", borderRadius:"10px",
                    boxShadow:"0 8px 24px rgba(45,27,0,0.12)", maxHeight:"200px",
                    overflowY:"auto", marginTop:"4px",
                  }}>
                    {mandaliList.map((v: string) => (
                      <div key={v}
                        onClick={() => selectMandali(v)}
                        style={{padding:"10px 14px", cursor:"pointer", fontSize:"0.88rem",
                          borderBottom:"1px solid #FFF3E0", color:"#2D1B00", transition:"background 0.15s"}}
                        onMouseEnter={e => (e.currentTarget.style.background = "#FFF8EC")}
                        onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
                      >{v}</div>
                    ))}
                  </div>
                )}
                {showMandaliList && mandaliSearch && mandaliList.length === 0 && (
                  <div style={{
                    position:"absolute", top:"100%", left:0, right:0, zIndex:100,
                    background:"#fff", border:"1.5px solid #E8C87A", borderRadius:"10px",
                    padding:"12px 14px", fontSize:"0.82rem", color:"#8B6540", marginTop:"4px",
                  }}>
                    No match — you can still type it manually.
                  </div>
                )}
              </div>
          </Field>
          )}

          <div className={styles.sectionTitle} style={{marginTop:"8px"}}>{settings?.paymentMethodHeading || "💳 Payment Method"}</div>

          <div className={styles.payToggle}>
            {(settings?.allowedPaymentMethods || ["online","cash"]).map((m: PayMethod) => (
              <div key={m} className={`${styles.payOpt} ${form.paymentMethod === m ? styles.paySelected : ""}`}
                onClick={() => set("paymentMethod", m)}>
                <div className={styles.payIcon}>
                  {m === "online" ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path></svg>
                  )}
                </div>
                <div className={styles.payTextWrap}>
                  <div className={styles.payName}>{m === "online" ? "Online Payment" : "Pay at Church"}</div>
                  <div className={styles.paySub}>{m === "online" ? `Pay ₹${settings?.onlineFee || 10} securely via Razorpay` : "Pay at the registration desk on the day"}</div>
                </div>
              </div>
            ))}
          </div>

          {apiError && <div className={styles.apiError} style={{marginTop: "16px"}}>⚠️ {apiError}</div>}

          <div style={{textAlign: "center", marginTop: "24px", marginBottom: "16px", fontSize: "1.1rem", fontWeight: "600", color: "#2D1B00", background: "#FFF8EC", padding: "12px", borderRadius: "8px", border: "1px dashed #E8C87A"}}>
            {settings?.registrationFeeLabel || "Registration Fee:"} <span style={{fontSize: "1.3rem", color: "#FF6B00"}}>₹{form.paymentMethod === "online" ? (settings?.onlineFee || 10) : (settings?.cashFee || 10)}</span>
          </div>

          <button className={styles.btnPrimary} onClick={handleContinue} disabled={loading}>
            {loading ? <><span className={styles.spinner}/> Saving...</> : `Continue to ${form.paymentMethod === 'online' ? 'Payment' : 'Confirm'} →`}
          </button>
        </div>
      )}

      {/* ══ STEP 2 ══ */}
      {step === 2 && (
        <div className={styles.card}>
          {form.paymentMethod === "online" ? (
            <>
              <div className={styles.sectionTitle}>💳 Secure Payment</div>

              {/* Amount box */}
              <div className={styles.amountBox}>
                <div className={styles.amount}>₹{settings?.onlineFee || 10}</div>
                <div className={styles.amountLabel}>Registration Fee • 2-Day Program</div>
              </div>

              {/* What Razorpay supports */}
              <div style={{display:"grid", gridTemplateColumns:"1fr", gap:"10px", margin:"16px 0"}}>
                {[
                  { icon:"📱", label:"UPI", sub:"Google Pay, PhonePe, Paytm, BHIM, etc." },
                ].map(opt => (
                  <div key={opt.label} style={{
                    background:"#FFF8EC", border:"1.5px solid #E8C87A", borderRadius:"12px",
                    padding:"16px", textAlign:"center"
                  }}>
                    <div style={{fontSize:"1.6rem"}}>{opt.icon}</div>
                    <div style={{fontSize:"0.9rem", fontWeight:700, color:"#2D1B00", marginTop:"6px"}}>{opt.label}</div>
                    <div style={{fontSize:"0.75rem", color:"#8B6540"}}>{opt.sub}</div>
                  </div>
                ))}
              </div>

              <div style={{
                background:"#E8F5E9", border:"1px solid #A5D6A7", borderRadius:"10px",
                padding:"10px 14px", fontSize:"0.78rem", color:"#2E7D32", marginBottom:"16px",
                display:"flex", alignItems:"center", gap:"8px"
              }}>
                🔒 <span>Payments are processed securely by <strong>Razorpay</strong>. Your payment is verified automatically.</span>
              </div>

              {apiError && <div className={styles.apiError}>⚠️ {apiError}</div>}

              <button className={styles.btnPrimary} onClick={handleRazorpayPayment} disabled={loading}>
                {loading
                  ? <><span className={styles.spinner}/> Opening Payment…</>
                  : `💳 Pay ₹${settings?.onlineFee || 10} Securely`}
              </button>
            </>
          ) : (
            <>
              <div className={styles.sectionTitle} style={{display: "flex", alignItems: "center", gap: "8px"}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 22V10l-6-6-6 6v12"></path><path d="M14 22v-4a2 2 0 0 0-4 0v4"></path><path d="M12 4v4"></path><path d="M10 6h4"></path></svg>
                Pay at Church
              </div>
              <div className={styles.cashBox}>
                <div style={{display:"flex",justifyContent:"center",marginBottom:"16px",color:"#2E7D32"}}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 22V10l-6-6-6 6v12"></path><path d="M14 22v-4a2 2 0 0 0-4 0v4"></path><path d="M12 4v4"></path><path d="M10 6h4"></path></svg>
                </div>
                <p>Please pay <strong>₹{settings?.cashFee || 10}</strong> at the registration desk upon arrival at the church.</p>
                <p style={{marginTop:"8px", opacity:0.8}}>We look forward to seeing you at the event!</p>
              </div>

              {apiError && <div className={styles.apiError}>⚠️ {apiError}</div>}

              <button className={styles.btnPrimary} onClick={submitCash} disabled={loading}>
                {loading ? <><span className={styles.spinner}/> Registering...</> : "✅ Confirm & Register"}
              </button>
            </>
          )}

          <button className={styles.btnBack} onClick={() => { setStep(1); setApiError(""); }}>← Go Back</button>
        </div>
      )}

      {/* ══ STEP 3 ══ */}
      {step === 3 && (
        <div className={styles.card}>
          <div className={styles.successWrap}>
            <div className={styles.successIcon}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <h2 className={styles.successTitle}>Registration Successful!</h2>
            <p className={styles.successSub}>
              You are registered for the <br/>
              <strong>{settings?.formTitle || "YouthFest 2-Day Program"}</strong>.<br/>
              See you at the event! 🎉
            </p>
            <div className={styles.regIdBox}>
              <div className={styles.regIdLabel}>Your Registration ID</div>
              <div className={styles.regIdVal}>{regId}</div>
            </div>
            <div className={styles.successMeta}>
              <div>👤 {form.name}</div>
              <div>📱 {form.mobile}</div>
              <div>🗺️ {form.district}</div>
              <div>🏘️ {form.village}, {form.mandali}</div>
              <div>
                {form.paymentMethod === "online"
                  ? `✅ Online Paid • ${form.txnId}`
                  : "💵 Pay at Church"}
              </div>
            </div>
            <button className={styles.btnPrimary} onClick={() => {
              sessionStorage.removeItem("yf_step");
              sessionStorage.removeItem("yf_form");
              sessionStorage.removeItem("yf_regId");
              setStep(1);
              setForm(EMPTY_FORM);
              setMandaliSearch("");
              setRegId("");
            }}>
              Register Another Person
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode
}) {
  return (
    <div style={{marginBottom:"16px"}}>
      <label style={{display:"block",fontSize:"0.78rem",fontWeight:600,color:"var(--text)",marginBottom:"6px"}}>
        {label} {required && <span style={{color:"var(--saffron)"}}>*</span>}
      </label>
      {children}
      {error && <div style={{color:"#e53935",fontSize:"0.72rem",marginTop:"4px"}}>{error}</div>}
    </div>
  );
}
