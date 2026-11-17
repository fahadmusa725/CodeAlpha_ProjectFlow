import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

export function isMailConfigured(): boolean {
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const appUrl = process.env.APP_URL?.trim();
  return Boolean(user && pass && appUrl);
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (cachedTransporter) return cachedTransporter;

  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  if (!user || !pass) return null;

  cachedTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
  });

  return cachedTransporter;
}

export interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendMail({ to, subject, text, html }: SendMailOptions): Promise<boolean> {
  if (!isMailConfigured()) {
    console.warn("Mail not sent: SMTP_USER, SMTP_PASS, or APP_URL is not configured.");
    return false;
  }

  const transporter = getTransporter();
  if (!transporter) {
    console.warn("Mail not sent: failed to initialize mail transporter.");
    return false;
  }

  const user = process.env.SMTP_USER!.trim();
  const sanitizedTo = sanitizeHeaderValue(to);
  const cleanSubject = sanitizeHeaderValue(subject).slice(0, 120);

  try {
    await transporter.sendMail({
      from: `"ProjectFlow" <${user}>`,
      to: sanitizedTo,
      subject: cleanSubject,
      text,
      html,
    });
    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown mail error";
    console.error("Failed to send email:", errorMsg);
    return false;
  }
}
