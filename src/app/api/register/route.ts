import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Registration from "@/models/Registration";
import Settings from "@/models/Settings";

export const dynamic = "force-dynamic";

function generateRegId() {
  return "REG-" + Math.floor(100000 + Math.random() * 900000);
}

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



    const settings = await Settings.findOne({}) || { onlineFee: 10, cashFee: 10 };
    const fee = paymentMethod === "cash" ? (settings.cashFee || 10) : (settings.onlineFee || 10);

    const regId = generateRegId();

    const registration = await Registration.create({
      regId,
      name,
      mobile,
      email: email || "N/A",
      village,
      district,
      mandali,
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

    return NextResponse.json({ success: true, regId, registration }, { status: 201 });
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

    const settings = await Settings.findOne({}) || { onlineFee: 10, cashFee: 10 };
    const fee = paymentMethod === "cash" ? (settings.cashFee || 10) : (settings.onlineFee || 10);
    
    let updateData: any = {
      name, mobile, email: email || "N/A", village, district, mandali,
      paymentMethod, amount: fee, customField1, customField2
    };

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

    return NextResponse.json({ success: true, regId, registration });
  } catch (err: any) {
    console.error("Registration update error:", err);
    return NextResponse.json({ error: "Server error", details: err.message }, { status: 500 });
  }
}
