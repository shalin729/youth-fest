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
  mandal: string;
  paymentMethod: PayMethod;
  txnId: string;
}

interface Errors {
  name?: string;
  mobile?: string;
  email?: string;
  district?: string;
  village?: string;
  mandal?: string;
  txnId?: string;
}

// Razorpay types
declare global {
  interface Window {
    Razorpay: any;
  }
}

const AMOUNT = "50";
const EMPTY_FORM: FormData = {
  name: "", mobile: "", email: "",
  district: "", village: "", mandal: "",
  paymentMethod: "online", txnId: "",
};

export default function RegisterPage() {
  const [step, setStep]         = useState<Step>(1);
  const [form, setForm]         = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors]     = useState<Errors>({});
  const [regId, setRegId]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [apiError, setApiError] = useState("");

  // Village search state
  const [villageSearch, setVillageSearch] = useState("");
  const [showVillageList, setShowVillageList] = useState(false);
  const villageRef = useRef<HTMLDivElement>(null);

  // Load Razorpay checkout script once
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  // Close village dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (villageRef.current && !villageRef.current.contains(e.target as Node))
        setShowVillageList(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const villageList = useMemo(() => {
    if (!form.district || form.district === "Other") return [];
    const all = VILLAGES[form.district] || [];
    const q = villageSearch.toLowerCase();
    return q ? all.filter(v => v.toLowerCase().includes(q)) : all;
  }, [form.district, villageSearch]);

  const set = (field: keyof FormData, value: string) => {
    if (field === "district") {
      setForm(f => ({ ...f, district: value as District, village: "" }));
      setVillageSearch("");
    } else {
      setForm(f => ({ ...f, [field]: value }));
    }
    setErrors(e => ({ ...e, [field]: "" }));
  };

  const selectVillage = (v: string) => {
    setForm(f => ({ ...f, village: v }));
    setErrors(e => ({ ...e, village: "" }));
    setVillageSearch(v);
    setShowVillageList(false);
  };

  const validate1 = () => {
    const e: Errors = {};
    if (!form.name.trim() || form.name.trim().length < 2) e.name = "Please enter your full name";
    if (!/^[6-9]\d{9}$/.test(form.mobile)) e.mobile = "Enter valid 10-digit mobile number";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter valid email address";
    if (!form.district) e.district = "Please select your district";
    if (!form.village.trim()) e.village = "Please enter your village name";
    if (!form.mandal.trim()) e.mandal = "Please enter your mandal name";
    setErrors(e);
    return Object.keys(e).length === 0;
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
        name:        "YouthFest",
        description: "2-Day Program Registration • ₹50",
        order_id:    orderData.orderId,
        prefill: {
          name:    form.name,
          contact: form.mobile,
          email:   form.email || undefined,
        },
        theme: { color: "#FF6B00" },
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
                name: form.name, mobile: form.mobile, email: form.email,
                district: form.district, village: form.village, mandal: form.mandal,
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, mobile: form.mobile, email: form.email,
          district: form.district, village: form.village, mandal: form.mandal,
          paymentMethod: "cash",
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

  const isKnownDistrict = form.district && form.district !== "Other";

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
          <div className={styles.sectionTitle}>📝 Personal Information</div>

          <Field label="Full Name" required error={errors.name}>
            <input placeholder="Enter your full name" value={form.name}
              onChange={e => set("name", e.target.value)} className={errors.name ? styles.inputError : ""} />
          </Field>

          <Field label="Mobile Number" required error={errors.mobile}>
            <input placeholder="10-digit mobile number" value={form.mobile} maxLength={10} inputMode="numeric"
              onChange={e => set("mobile", e.target.value.replace(/\D/g,""))} className={errors.mobile ? styles.inputError : ""}/>
          </Field>

          <Field label="Email ID" error={errors.email}>
            <input type="email" placeholder="example@gmail.com (optional)" value={form.email}
              onChange={e => set("email", e.target.value)} className={errors.email ? styles.inputError : ""}/>
          </Field>

          <div className={styles.sectionTitle} style={{marginTop:"8px"}}>📍 Location Details</div>

          {/* District */}
          <Field label="District" required error={errors.district}>
            <select
              value={form.district}
              onChange={e => set("district", e.target.value)}
              className={errors.district ? styles.inputError : ""}
              style={{width:"100%", padding:"10px 12px", border:`1.5px solid ${errors.district ? "#e53935" : "#E8C87A"}`,
                borderRadius:"10px", fontSize:"0.9rem", fontFamily:"inherit",
                background:"#fff", color: form.district ? "inherit" : "#aaa",
                outline:"none", appearance:"auto"}}
            >
              <option value="" disabled>Select your district</option>
              {DISTRICTS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </Field>

          {/* Village — searchable for known districts, free text for Other */}
          <Field label="Village Name" required error={errors.village}>
            {isKnownDistrict ? (
              <div ref={villageRef} style={{position:"relative"}}>
                <input
                  placeholder={`Search village in ${form.district}…`}
                  value={villageSearch}
                  autoComplete="off"
                  className={errors.village ? styles.inputError : ""}
                  onChange={e => {
                    setVillageSearch(e.target.value);
                    setForm(f => ({ ...f, village: e.target.value }));
                    setErrors(er => ({ ...er, village: "" }));
                    setShowVillageList(true);
                  }}
                  onFocus={() => setShowVillageList(true)}
                />
                {showVillageList && villageList.length > 0 && (
                  <div style={{
                    position:"absolute", top:"100%", left:0, right:0, zIndex:100,
                    background:"#fff", border:"1.5px solid #E8C87A", borderRadius:"10px",
                    boxShadow:"0 8px 24px rgba(45,27,0,0.12)", maxHeight:"200px",
                    overflowY:"auto", marginTop:"4px",
                  }}>
                    {villageList.map(v => (
                      <div key={v}
                        onMouseDown={() => selectVillage(v)}
                        style={{padding:"10px 14px", cursor:"pointer", fontSize:"0.88rem",
                          borderBottom:"1px solid #FFF3E0", color:"#2D1B00", transition:"background 0.15s"}}
                        onMouseEnter={e => (e.currentTarget.style.background = "#FFF8EC")}
                        onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
                      >{v}</div>
                    ))}
                  </div>
                )}
                {showVillageList && villageSearch && villageList.length === 0 && (
                  <div style={{
                    position:"absolute", top:"100%", left:0, right:0, zIndex:100,
                    background:"#fff", border:"1.5px solid #E8C87A", borderRadius:"10px",
                    padding:"12px 14px", fontSize:"0.82rem", color:"#8B6540", marginTop:"4px",
                  }}>
                    No match — you can still type the village name manually.
                  </div>
                )}
              </div>
            ) : (
              <input
                placeholder={form.district === "Other" ? "Enter your village name" : "Select district first"}
                value={form.village}
                disabled={!form.district}
                onChange={e => set("village", e.target.value)}
                className={errors.village ? styles.inputError : ""}
              />
            )}
          </Field>

          <Field label="Mandal Name" required error={errors.mandal}>
            <input placeholder="Enter your mandal name" value={form.mandal}
              onChange={e => set("mandal", e.target.value)} className={errors.mandal ? styles.inputError : ""}/>
          </Field>

          <div className={styles.sectionTitle} style={{marginTop:"8px"}}>💳 Payment Method</div>

          <div className={styles.payToggle}>
            {(["online","cash"] as PayMethod[]).map(m => (
              <div key={m} className={`${styles.payOpt} ${form.paymentMethod === m ? styles.paySelected : ""}`}
                onClick={() => set("paymentMethod", m)}>
                <span className={styles.payIcon}>{m === "online" ? "📱" : "💵"}</span>
                <div className={styles.payName}>{m === "online" ? "Online" : "Cash"}</div>
                <div className={styles.paySub}>{m === "online" ? "Pay ₹50 via Razorpay" : "Pay at venue"}</div>
              </div>
            ))}
          </div>

          <button className={styles.btnPrimary} onClick={() => validate1() && setStep(2)}>
            Continue →
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
                <div className={styles.amount}>₹50</div>
                <div className={styles.amountLabel}>Registration Fee • 2-Day Program</div>
              </div>

              {/* What Razorpay supports */}
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", margin:"16px 0"}}>
                {[
                  { icon:"📱", label:"UPI", sub:"GPay, PhonePe, BHIM" },
                  { icon:"💳", label:"Debit / Credit Card", sub:"Visa, Mastercard, RuPay" },
                  { icon:"🏦", label:"Net Banking", sub:"All major banks" },
                  { icon:"👛", label:"Wallets", sub:"Paytm, Amazon Pay" },
                ].map(opt => (
                  <div key={opt.label} style={{
                    background:"#FFF8EC", border:"1.5px solid #E8C87A", borderRadius:"12px",
                    padding:"12px", textAlign:"center"
                  }}>
                    <div style={{fontSize:"1.4rem"}}>{opt.icon}</div>
                    <div style={{fontSize:"0.78rem", fontWeight:700, color:"#2D1B00", marginTop:"4px"}}>{opt.label}</div>
                    <div style={{fontSize:"0.68rem", color:"#8B6540"}}>{opt.sub}</div>
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
                  : "💳 Pay ₹50 Securely"}
              </button>
            </>
          ) : (
            <>
              <div className={styles.sectionTitle}>💵 Cash Payment</div>
              <div className={styles.cashBox}>
                <div style={{fontSize:"2.5rem",marginBottom:"8px"}}>🙏</div>
                <p>Please pay <strong>₹50</strong> at the registration counter on the day of the event.</p>
                <p style={{marginTop:"8px", opacity:0.8}}>Your spot will be reserved upon confirmation.</p>
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
            <div className={styles.successIcon}>🙏</div>
            <h2 className={styles.successTitle}>Registration Successful!</h2>
            <p className={styles.successSub}>
              You are registered for the<br/><strong>YouthFest 2-Day Program</strong>.<br/>See you at the event! 🎉
            </p>
            <div className={styles.regIdBox}>
              <div className={styles.regIdLabel}>Your Registration ID</div>
              <div className={styles.regIdVal}>{regId}</div>
            </div>
            <div className={styles.successMeta}>
              <div>👤 {form.name}</div>
              <div>📱 {form.mobile}</div>
              <div>🗺️ {form.district}</div>
              <div>🏘️ {form.village}, {form.mandal}</div>
              <div>
                {form.paymentMethod === "online"
                  ? `✅ Online Paid • ${form.txnId}`
                  : "💵 Cash at Venue"}
              </div>
            </div>
            <button className={styles.btnPrimary} onClick={() => {
              setStep(1);
              setForm(EMPTY_FORM);
              setVillageSearch("");
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
