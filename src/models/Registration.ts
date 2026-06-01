import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRegistration extends Document {
  regId: string;
  name: string;
  mobile: string;
  email: string;
  village: string;
  district: string;
  mandali: string;
  paymentMethod: "online" | "cash";
  paymentStatus: "pending" | "paid" | "failed";
  txnId?: string;
  amount: number;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  customField1?: string;
  customField2?: string;
  isDraft: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RegistrationSchema = new Schema<IRegistration>(
  {
    regId: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, match: /^[6-9]\d{9}$/ },
    email: { type: String, default: "N/A", trim: true },
    village: { type: String, default: "N/A", trim: true },
    district: { type: String, default: "N/A", trim: true },
    mandali: { type: String, default: "N/A", trim: true },
    paymentMethod: { type: String, enum: ["online", "cash"], required: true },
    paymentStatus: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
    txnId: { type: String, default: "" },
    amount: { type: Number, default: 50 },
    razorpayOrderId: { type: String, default: "" },
    razorpayPaymentId: { type: String, default: "" },
    customField1: { type: String },
    customField2: { type: String },
    isDraft: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Registration: Model<IRegistration> =
  mongoose.models.Registration ||
  mongoose.model<IRegistration>("Registration", RegistrationSchema);

export default Registration;
