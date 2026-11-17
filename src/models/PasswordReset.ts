import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPasswordReset extends Document {
  user: mongoose.Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const PasswordResetSchema = new Schema<IPasswordReset>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

PasswordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordReset: Model<IPasswordReset> =
  mongoose.models.PasswordReset ||
  mongoose.model<IPasswordReset>("PasswordReset", PasswordResetSchema);
