import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Settings from "@/models/Settings";
import Registration from "@/models/Registration";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    let settings = await Settings.findOne({});
    if (!settings) {
      settings = await Settings.create({ onlineFee: 10, cashFee: 10 });
    }
    
    const allMandalis = await Registration.distinct("mandali");
    const officialOptions = settings.mandaliOptions || [];
    const suggestedMandalis = allMandalis.filter((m: string) => 
      m && typeof m === 'string' && m.trim() !== "" && !officialOptions.includes(m.trim())
    );

    return NextResponse.json({ success: true, settings, suggestedMandalis });
  } catch (err: any) {
    console.error("Settings GET error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = req.cookies.get("admin_token")?.value;
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const payload = await req.json();

    let settings = await Settings.findOne({});
    
    if (!settings) {
      settings = await Settings.create(payload);
    } else {
      Object.assign(settings, payload);
      await settings.save();
    }

    return NextResponse.json({ success: true, settings });
  } catch (err: any) {
    console.error("Settings PATCH error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
