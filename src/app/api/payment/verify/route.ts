import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import connectDB from "@/lib/mongodb";
import Registration from "@/models/Registration";

function generateRegId() {
  return "REG-" + Math.floor(100000 + Math.random() * 900000);
}

// POST /api/payment/verify
// 1. Verifies Razorpay payment signature (cryptographic proof money was received)
// 2. Saves registration to MongoDB with paymentStatus = "paid"
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      // Form data
      name, mobile, email, district, village, mandal,
    } = body;

    // ── Step 1: Verify the HMAC-SHA256 signature ──────────────────────────
    // This proves the payment actually happened in Razorpay's system
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json(
        { error: "Payment verification failed. Invalid signature." },
        { status: 400 }
      );
    }

    // ── Step 2: Save registration to DB ───────────────────────────────────
    await connectDB();

    // Check duplicate mobile
    const existing = await Registration.findOne({ mobile });
    if (existing) {
      return NextResponse.json(
        { error: "This mobile number is already registered", regId: existing.regId },
        { status: 409 }
      );
    }

    const regId = generateRegId();

    const registration = await Registration.create({
      regId,
      name,
      mobile,
      email: email || "N/A",
      district,
      village,
      mandal,
      paymentMethod:  "online",
      paymentStatus:  "paid",       // Verified by Razorpay — guaranteed paid
      txnId:          razorpay_payment_id,
      amount:         50,
      razorpayOrderId:   razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
    });

    // Optional: sync to Google Sheets
    const sheetUrl = process.env.GOOGLE_SHEET_URL;
    if (sheetUrl && sheetUrl !== "YOUR_GOOGLE_SHEET_WEBAPP_URL") {
      try {
        await fetch(sheetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            timestamp: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
            regId,
            name,
            mobile,
            email: email || "N/A",
            district,
            village,
            mandal,
            payment:  "online (Razorpay)",
            txnId:    razorpay_payment_id,
            status:   "paid",
          }),
        });
      } catch (e) {
        console.warn("Google Sheets sync failed:", e);
      }
    }

    return NextResponse.json({ success: true, regId, registration }, { status: 201 });
  } catch (err: any) {
    console.error("Payment verify error:", err);
    return NextResponse.json({ error: "Server error", details: err.message }, { status: 500 });
  }
}
