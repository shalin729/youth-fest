import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Registration from "@/models/Registration";

function generateRegId() {
  return "REG-" + Math.floor(100000 + Math.random() * 900000);
}

// POST /api/register — Save new registration
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    const { name, mobile, email, village, district, mandal, paymentMethod, txnId } = body;

    // Validation
    if (!name || !mobile || !village || !district || !mandal || !paymentMethod) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return NextResponse.json({ error: "Invalid mobile number" }, { status: 400 });
    }

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
      village,
      district,
      mandal,
      paymentMethod,
      paymentStatus: paymentMethod === "cash" ? "pending" : txnId ? "paid" : "pending",
      txnId: txnId || "",
      amount: 50,
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
            mandal,
            payment: paymentMethod,
            txnId: txnId || "CASH",
            status: registration.paymentStatus,
          }),
        });
      } catch (e) {
        console.warn("Google Sheets sync failed:", e);
      }
    }

    return NextResponse.json({ success: true, regId, registration }, { status: 201 });
  } catch (err: any) {
    console.error("Registration error:", err);
    return NextResponse.json({ error: "Server error", details: err.message }, { status: 500 });
  }
}
