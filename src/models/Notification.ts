import mongoose, { Schema, Document, Model } from "mongoose";

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  actor: mongoose.Types.ObjectId;
  type: "assigned" | "comment" | "added_to_project";
  project: mongoose.Types.ObjectId;
  task?: mongoose.Types.ObjectId;
  message: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    actor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["assigned", "comment", "added_to_project"], required: true },
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    task: { type: Schema.Types.ObjectId, ref: "Task" },
    message: { type: String, required: true, maxlength: 200 },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NotificationSchema.index({ user: 1, read: 1, createdAt: -1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);
