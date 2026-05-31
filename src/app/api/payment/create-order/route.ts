import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// POST /api/payment/create-order
// Creates a Razorpay order for ₹50 and returns the order details to the frontend
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, mobile } = body;

    if (!name || !mobile) {
      return NextResponse.json({ error: "Missing name or mobile" }, { status: 400 });
    }

    const order = await razorpay.orders.create({
      amount:   5000,      // ₹50 in paise (1 INR = 100 paise)
      currency: "INR",
      receipt:  `rcpt_${mobile}_${Date.now()}`,
      notes: {
        name,
        mobile,
        event: "YouthFest 2-Day Program",
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
