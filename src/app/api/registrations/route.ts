import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Registration from "@/models/Registration";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const { searchParams } = req.nextUrl;
    const showDeleted = searchParams.get("showDeleted") === "true";
    const filter = showDeleted 
      ? { isDraft: { $ne: true } } 
      : { isDeleted: { $ne: true }, isDraft: { $ne: true } };

    const registrations = await Registration.find(filter)
      .sort({ createdAt: -1 })
      .select("-__v");

    const stats = {
      total: registrations.length,
      paid: registrations.filter((r) => r.paymentStatus === "paid").length,
      pending: registrations.filter((r) => r.paymentStatus === "pending").length,
      online: registrations.filter((r) => r.paymentMethod === "online").length,
      cash: registrations.filter((r) => r.paymentMethod === "cash").length,
      totalAmount: registrations
        .filter((r) => r.paymentStatus === "paid")
        .reduce((sum, r) => sum + (r.amount || 0), 0),
    };

    return NextResponse.json({ success: true, stats, registrations });
  } catch (err: any) {
    console.error("Registrations API Error:", err);
    return NextResponse.json({ error: "Server error", details: err.message }, { status: 500 });
  }
}

// POST /api/registrations — Manual creation by admin
export async function POST(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const data = await req.json();
    const regId = "YF" + Math.random().toString(36).substr(2, 6).toUpperCase();
    
    const newReg = await Registration.create({
      ...data,
      regId,
      isDraft: false,
    });

    return NextResponse.json({ success: true, registration: newReg });
  } catch (err: any) {
    console.error("Create Registration Error:", err);
    return NextResponse.json({ error: "Server error", details: err.message }, { status: 500 });
  }
}

// PATCH /api/registrations — update registration details or payment status
export async function PATCH(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const { regId, ...updates } = await req.json();

    const updated = await Registration.findOneAndUpdate(
      { regId },
      { $set: updates },
      { new: true }
    );

    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, registration: updated });
  } catch (err: any) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE /api/registrations — soft delete
export async function DELETE(req: NextRequest) {
  const token = req.cookies.get("admin_token")?.value;
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const { searchParams } = req.nextUrl;
    const regId = searchParams.get("regId");
    if (!regId) return NextResponse.json({ error: "Missing regId" }, { status: 400 });

    const reg = await Registration.findOne({ regId });
    if (!reg) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (reg.paymentStatus === "paid") {
      return NextResponse.json({ error: "Cannot delete a paid registration" }, { status: 400 });
    }

    reg.isDeleted = true;
    await reg.save();

    return NextResponse.json({ success: true, message: "Soft deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
