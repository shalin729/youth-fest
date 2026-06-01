import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import connectDB from "@/lib/mongodb";
import Registration from "@/models/Registration";
import Settings from "@/models/Settings";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

// Force dynamic — prevents Next.js from trying to pre-render this route at build time
export const dynamic = "force-dynamic";

// POST /api/payment/create-order
export async function POST(req: NextRequest) {
  try {
    // Initialize Razorpay lazily so missing env vars don't break the build
    const razorpay = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const body = await req.json();
    const { name, mobile, paymentMethod, email, district, village, mandali } = body;

    if (!name || !mobile) {
      return NextResponse.json({ error: "Missing name or mobile" }, { status: 400 });
    }
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return NextResponse.json({ error: "Invalid mobile number" }, { status: 400 });
    }

    if (name.length > 100) {
      return NextResponse.json({ error: "Name is too long" }, { status: 400 });
    }

    const ip = getClientIp(req);
    if (!checkRateLimit(ip, 5, 60000)) { // 5 requests per minute
      return NextResponse.json({ error: "Too many payment attempts. Please try again later." }, { status: 429 });
    }

    await connectDB();

    const settings = await Settings.findOne({}) || { onlineFee: 10 };
    const onlineFee = settings.onlineFee || 10;

    const order = await razorpay.orders.create({
      amount:   onlineFee * 100,      // dynamic fee in paise (1 INR = 100 paise)
      currency: "INR",
      receipt:  `rcpt_${mobile}_${Date.now()}`,
      notes: {
        name,
        mobile,
        event: "YouthFest 1-Day Program",
      },
    });

    return NextResponse.json({
      orderId:  order.id,
      amount:   order.amount,
      currency: order.currency,
      keyId:    process.env.RAZORPAY_KEY_ID,
    });
  } catch (err: any) {
    console.error("Create order error:", err);
    return NextResponse.json({ error: "Failed to create payment order", details: err.message }, { status: 500 });
  }
}
