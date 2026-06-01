import mongoose, { Schema, Document } from "mongoose";

export interface IFieldConfig {
  enabled: boolean;
  required: boolean;
  label: string;
}

export interface ICustomField {
  id: string;
  enabled: boolean;
  required: boolean;
  label: string;
  type: string; // 'text', 'dropdown'
  options?: string[]; // for dropdowns
}

export interface ISettings extends Document {
  onlineFee: number;
  cashFee: number;
  allowedPaymentMethods: string[];
  registrationsOpen: boolean;
  formTitle: string;
  personalInfoHeading: string;
  locationDetailsHeading: string;
  paymentMethodHeading: string;
  registrationFeeLabel: string;
  mandaliOptions: string[];
  fieldsConfig: {
    email: IFieldConfig;
    district: IFieldConfig;
    village: IFieldConfig;
    mandali: IFieldConfig;
  };
  customFields: ICustomField[];
  lastRegSeq: number;
}

const FieldConfigSchema = new Schema<IFieldConfig>({
  enabled: { type: Boolean, required: true, default: true },
  required: { type: Boolean, required: true, default: true },
  label: { type: String, required: true },
}, { _id: false });

const CustomFieldSchema = new Schema<ICustomField>({
  id: { type: String, required: true },
  enabled: { type: Boolean, required: true, default: false },
  required: { type: Boolean, required: true, default: false },
  label: { type: String, required: true },
  type: { type: String, required: true, default: "text" },
  options: [{ type: String }],
}, { _id: false });

const SettingsSchema = new Schema<ISettings>(
  {
    onlineFee: { type: Number, required: true, default: 10 },
    cashFee: { type: Number, required: true, default: 10 },
    allowedPaymentMethods: { type: [String], default: ["online", "cash"] },
    registrationsOpen: { type: Boolean, required: true, default: true },
    formTitle: { type: String, required: true, default: "YouthFest 2-Day Program" },
    personalInfoHeading: { type: String, required: true, default: "📝 Personal Information" },
    locationDetailsHeading: { type: String, required: true, default: "📍 Location Details" },
    paymentMethodHeading: { type: String, required: true, default: "💳 Payment Method" },
    registrationFeeLabel: { type: String, required: true, default: "Registration Fee:" },
    mandaliOptions: { type: [String], default: [] },
    fieldsConfig: {
      email: { type: FieldConfigSchema, default: () => ({ enabled: true, required: false, label: "Email ID" }) },
      district: { type: FieldConfigSchema, default: () => ({ enabled: true, required: true, label: "District" }) },
      village: { type: FieldConfigSchema, default: () => ({ enabled: true, required: true, label: "Village Name" }) },
      mandali: { type: FieldConfigSchema, default: () => ({ enabled: true, required: true, label: "Mandali Name" }) },
    },
    customFields: { type: [CustomFieldSchema], default: [] },
    lastRegSeq: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.Settings || mongoose.model<ISettings>("Settings", SettingsSchema);
