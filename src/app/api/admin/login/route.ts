import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Admin from "@/models/Admin";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    const admin = await Admin.findOne({ username });
    
    if (!admin) {
      // First admin setup block
      const adminCount = await Admin.countDocuments();
      if (adminCount === 0) {
        const passwordHash = await bcrypt.hash(password, 10);
        const newAdmin = await Admin.create({ username, passwordHash });
        
        const token = signToken({ id: newAdmin._id, username });
        const response = NextResponse.json({ success: true, message: "First admin created and logged in." });
        response.cookies.set("admin_token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: "/",
          maxAge: 7 * 24 * 60 * 60, // 7 days
        });
        return response;
      }
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Success
    const token = signToken({ id: admin._id, username });
    const response = NextResponse.json({ success: true });
    response.cookies.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });
    return response;

  } catch (err: any) {
    console.error("Admin login error:", err);
    return NextResponse.json({ error: "Server error", message: err.message, stack: err.stack }, { status: 500 });
  }
}
