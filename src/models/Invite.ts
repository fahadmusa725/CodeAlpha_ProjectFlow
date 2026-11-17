import mongoose, { Schema, Document, Model } from "mongoose";

export interface IInvite extends Document {
  project: mongoose.Types.ObjectId;
  email: string;
  invitedBy: mongoose.Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  acceptedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const InviteSchema = new Schema<IInvite>(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

InviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
InviteSchema.index({ project: 1, email: 1 });

export const Invite: Model<IInvite> =
  mongoose.models.Invite || mongoose.model<IInvite>("Invite", InviteSchema);
