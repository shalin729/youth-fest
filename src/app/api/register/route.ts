import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Registration from "@/models/Registration";
import Settings from "@/models/Settings";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// POST /api/register — Save new registration
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    const { name, mobile, email, village, district, mandali, paymentMethod, txnId, customField1, customField2, confirmCash } = body;

    // Validation (core fields only, other fields are dynamically validated on frontend)
    if (!name || !mobile || !paymentMethod) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return NextResponse.json({ error: "Invalid mobile number" }, { status: 400 });
    }


    const ip = getClientIp(req);
    if (!checkRateLimit(ip, 5, 60000)) { // 5 requests per minute
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    if (name.length > 100 || village?.length > 100 || district?.length > 100 || mandali?.length > 100) {
      return NextResponse.json({ error: "Input fields exceed maximum length" }, { status: 400 });
    }

    const settings = (await Settings.findOneAndUpdate(
      {},
      { $inc: { lastRegSeq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true, strict: false }
    ).lean()) as any;
    const fee = paymentMethod === "cash" ? (settings.cashFee || 10) : (settings.onlineFee || 10);

    const seq = settings.lastRegSeq || 1;
    const regId = "REG-" + seq.toString().padStart(4, '0');

    const registration = await Registration.create({
      regId,
      name,
      mobile,
      email: email || "N/A",
      village: village || "N/A",
      district: district || "N/A",
      mandali: mandali || "N/A",
      paymentMethod,
      paymentStatus: paymentMethod === "cash" ? "pending" : txnId ? "paid" : "pending",
      txnId: txnId || "",
      amount: fee,
      customField1,
      customField2,
      isDraft: !confirmCash,
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
            village,
            district,
            mandali,
            payment: paymentMethod,
            txnId: txnId || "CASH",
            status: registration.paymentStatus,
          }),
        });
      } catch (e) {
        console.warn("Google Sheets sync failed:", e);
      }
    }
    // Mask the returned document
    const safeRegistration = {
      regId: registration.regId,
      name: registration.name,
      paymentMethod: registration.paymentMethod,
      paymentStatus: registration.paymentStatus,
      amount: registration.amount
    };

    return NextResponse.json({ success: true, regId, registration: safeRegistration }, { status: 201 });
  } catch (err: any) {
    console.error("Registration error:", err);
    return NextResponse.json({ error: "Server error", details: err.message }, { status: 500 });
  }
}

// PATCH /api/register — Update existing pending registration
export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { regId, name, mobile, email, village, district, mandali, paymentMethod, customField1, customField2, confirmCash } = body;

    if (!regId) return NextResponse.json({ error: "Missing regId" }, { status: 400 });
    const ip = getClientIp(req);
    if (!checkRateLimit(ip, 10, 60000)) { // 10 updates per minute
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    if (name?.length > 100 || village?.length > 100 || district?.length > 100 || mandali?.length > 100) {
      return NextResponse.json({ error: "Input fields exceed maximum length" }, { status: 400 });
    }

    const settings = await Settings.findOne({}) || { onlineFee: 10, cashFee: 10 };
    const fee = paymentMethod === "cash" ? (settings.cashFee || 10) : (settings.onlineFee || 10);
    
    let updateData: any = {
      name, mobile, email: email || "N/A", 
      village: village || "N/A", 
      district: district || "N/A", 
      mandali: mandali || "N/A",
      paymentMethod, amount: fee, customField1, customField2
    };

    if (paymentMethod === "cash") {
      updateData.paymentStatus = "pending";
    }

    if (confirmCash) {
      updateData.isDraft = false;
    }

    const registration = await Registration.findOneAndUpdate(
      { regId },
      updateData,
      { new: true }
    );

    if (!registration) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }
    const safeRegistration = {
      regId: registration.regId,
      name: registration.name,
      paymentMethod: registration.paymentMethod,
      paymentStatus: registration.paymentStatus,
      amount: registration.amount
    };

    return NextResponse.json({ success: true, regId, registration: safeRegistration });
  } catch (err: any) {
    console.error("Registration update error:", err);
    return NextResponse.json({ error: "Server error", details: err.message }, { status: 500 });
  }
}
