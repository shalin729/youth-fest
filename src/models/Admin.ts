import mongoose, { Schema, Document } from "mongoose";
import crypto from "crypto";

export interface IAdmin extends Document {
  username: string;
  passwordHash: string;
}

const AdminSchema = new Schema<IAdmin>(
  {
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Admin || mongoose.model<IAdmin>("Admin", AdminSchema);
