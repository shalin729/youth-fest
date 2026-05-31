import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRegistration extends Document {
  regId: string;
  name: string;
  mobile: string;
  email: string;
  village: string;
  district: string;
  mandal: string;
  paymentMethod: "online" | "cash";
  paymentStatus: "pending" | "paid" | "failed";
  txnId?: string;
  amount: number;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RegistrationSchema = new Schema<IRegistration>(
  {
    regId: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, match: /^[6-9]\d{9}$/ },
    email: { type: String, default: "N/A", trim: true },
    village: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    mandal: { type: String, required: true, trim: true },
    paymentMethod: { type: String, enum: ["online", "cash"], required: true },
    paymentStatus: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
    txnId: { type: String, default: "" },
    amount: { type: Number, default: 50 },
    razorpayOrderId: { type: String, default: "" },
    razorpayPaymentId: { type: String, default: "" },
  },
  { timestamps: true }
);

const Registration: Model<IRegistration> =
  mongoose.models.Registration ||
  mongoose.model<IRegistration>("Registration", RegistrationSchema);

export default Registration;
