import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Registration from "@/models/Registration";

export const dynamic = "force-dynamic";

// GET /api/registrations?password=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const password = searchParams.get("password");

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const registrations = await Registration.find({})
      .sort({ createdAt: -1 })
      .select("-__v");

    const stats = {
      total: registrations.length,
      paid: registrations.filter((r) => r.paymentStatus === "paid").length,
      pending: registrations.filter((r) => r.paymentStatus === "pending").length,
      online: registrations.filter((r) => r.paymentMethod === "online").length,
      cash: registrations.filter((r) => r.paymentMethod === "cash").length,
      totalAmount: registrations.filter((r) => r.paymentStatus === "paid").length * 50,
    };

    return NextResponse.json({ success: true, stats, registrations });
  } catch (err: any) {
    return NextResponse.json({ error: "Server error", details: err.message }, { status: 500 });
  }
}

// PATCH /api/registrations — update payment status
export async function PATCH(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const password = searchParams.get("password");

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const { regId, paymentStatus, txnId } = await req.json();

    const updated = await Registration.findOneAndUpdate(
      { regId },
      { paymentStatus, ...(txnId && { txnId }) },
      { new: true }
    );

    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, registration: updated });
  } catch (err: any) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
