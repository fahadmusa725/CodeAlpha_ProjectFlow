/**
 * Demo data seed script.
 *
 * Run:   npm run seed          (removes then inserts demo data)
 * Run:   npm run seed:remove   (removes demo data only)
 *
 * Safety:
 *   - Only touches documents whose owner/user email ends in @projectflow.demo
 *   - Refuses to run when NODE_ENV === "production"
 *   - Uses Model.collection.insertMany() so explicit createdAt/updatedAt are
 *     preserved. Mongoose's timestamps middleware fires on save/create and can
 *     override explicit values in Model.insertMany(); the native collection
 *     method bypasses that middleware entirely.
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { Project } from "@/models/Project";
import { Task } from "@/models/Task";
import { Comment } from "@/models/Comment";
import { Notification } from "@/models/Notification";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEMO_DOMAIN = "@projectflow.demo";
const DEMO_PASSWORD = "projectflow-demo-1234";

// ---------------------------------------------------------------------------
// Safety guard
// ---------------------------------------------------------------------------

if (process.env.NODE_ENV === "production") {
  console.error("ERROR: Refusing to run seed script in production.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a Date that is `days` days before now. */
function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

/** Returns a Date that is `days` days after now. */
function daysFromNow(days: number): Date {
  return daysAgo(-days);
}

/** Clamps a string to maxLen chars (mirrors the server truncate util). */
function truncate(str: string, maxLen: number): string {
  return str.length <= maxLen ? str : str.slice(0, maxLen);
}

/** Builds a notification message exactly the way src/lib/notifications.ts does. */
function buildMessage(
  type: "assigned" | "comment" | "added_to_project",
  actorName: string,
  targetTitle: string
): string {
  const t = truncate(targetTitle, 60);
  if (type === "assigned") return `${actorName} assigned you to "${t}"`;
  if (type === "comment") return `${actorName} commented on "${t}"`;
  return `${actorName} added you to "${t}"`;
}

// ---------------------------------------------------------------------------
// Type for raw task documents (bypasses Mongoose, all fields explicit)
// ---------------------------------------------------------------------------

interface RawTask {
  _id: mongoose.Types.ObjectId;
  project: mongoose.Types.ObjectId;
  title: string;
  description: string;
  status: "todo" | "in-progress" | "done";
  priority: "low" | "medium" | "high";
  labels: string[];
  assignee?: mongoose.Types.ObjectId;
  order: number;
  dueDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: mongoose.Types.ObjectId;
}

// ---------------------------------------------------------------------------
// Remove demo data
// ---------------------------------------------------------------------------

async function removeDemoData(): Promise<void> {
  console.log("\n-- Removing existing demo data --");

  const demoUsers = await User.find(
    { email: { $regex: `${DEMO_DOMAIN}$` } },
    { _id: 1 }
  ).lean();
  const demoUserIds = demoUsers.map((u) => u._id);

  const demoProjects = await Project.find(
    { owner: { $in: demoUserIds } },
    { _id: 1 }
  ).lean();
  const demoProjectIds = demoProjects.map((p) => p._id);

  // Collect task IDs before deleting tasks so we can scope comment deletion.
  const demoTasks = await Task.find(
    { project: { $in: demoProjectIds } },
    { _id: 1 }
  ).lean();
  const demoTaskIds = demoTasks.map((t) => t._id);

  // Delete in dependency order.
  const notifResult = await Notification.deleteMany({
    $or: [
      { project: { $in: demoProjectIds } },
      { user: { $in: demoUserIds } },
    ],
  });
  const commentResult = await Comment.deleteMany({ task: { $in: demoTaskIds } });
  const taskResult = await Task.deleteMany({ project: { $in: demoProjectIds } });
  const projectResult = await Project.deleteMany({ owner: { $in: demoUserIds } });
  const userResult = await User.deleteMany({ email: { $regex: `${DEMO_DOMAIN}$` } });

  console.log(`  Users removed:         ${userResult.deletedCount}`);
  console.log(`  Projects removed:      ${projectResult.deletedCount}`);
  console.log(`  Tasks removed:         ${taskResult.deletedCount}`);
  console.log(`  Comments removed:      ${commentResult.deletedCount}`);
  console.log(`  Notifications removed: ${notifResult.deletedCount}`);
}

// ---------------------------------------------------------------------------
// Insert demo data
// ---------------------------------------------------------------------------

async function insertDemoData(): Promise<void> {
  console.log("\n-- Inserting demo data --");

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // -------------------------------------------------------------------------
  // Users
  // -------------------------------------------------------------------------

  const userData = [
    { name: "Arjun Sharma",  email: "arjun.sharma@projectflow.demo"  },
    { name: "Priya Mehta",   email: "priya.mehta@projectflow.demo"   },
    { name: "Daniel Okafor", email: "daniel.okafor@projectflow.demo" },
    { name: "Sofia Reyes",   email: "sofia.reyes@projectflow.demo"   },
    { name: "Lena Fischer",  email: "lena.fischer@projectflow.demo"  },
  ];

  const userDocs = userData.map((u) => ({
    _id: new mongoose.Types.ObjectId(),
    name: u.name,
    email: u.email,
    passwordHash,
    createdAt: daysAgo(30),
    updatedAt: daysAgo(30),
  }));

  await User.collection.insertMany(userDocs);

  const [arjun, priya, daniel, sofia, lena] = userDocs;

  // -------------------------------------------------------------------------
  // Projects
  // -------------------------------------------------------------------------

  const project1Id = new mongoose.Types.ObjectId();
  const project2Id = new mongoose.Types.ObjectId();
  const project3Id = new mongoose.Types.ObjectId();

  const projectDocs = [
    {
      _id: project1Id,
      name: "Clinic Appointment System",
      description:
        "Build a web-based scheduling platform for a network of GP clinics, covering patient bookings, reminders, and doctor availability.",
      owner: arjun._id,
      members: [
        { user: arjun._id,  role: "owner"  },
        { user: priya._id,  role: "member" },
        { user: daniel._id, role: "member" },
        { user: sofia._id,  role: "member" },
      ],
      createdAt: daysAgo(28),
      updatedAt: daysAgo(1),
    },
    {
      _id: project2Id,
      name: "Brand Refresh",
      description:
        "Redesign the company's visual identity: logo, colour palette, typography, and brand guidelines document.",
      owner: priya._id,
      members: [
        { user: priya._id, role: "owner"  },
        { user: sofia._id, role: "member" },
        { user: lena._id,  role: "member" },
      ],
      createdAt: daysAgo(20),
      updatedAt: daysAgo(2),
    },
    {
      _id: project3Id,
      name: "Office Move Q1",
      description:
        "Coordinate the physical relocation of the engineering team to the new floor, including IT setup and logistics.",
      owner: daniel._id,
      members: [
        { user: daniel._id, role: "owner"  },
        { user: lena._id,   role: "member" },
      ],
      createdAt: daysAgo(14),
      updatedAt: daysAgo(1),
    },
  ];

  await Project.collection.insertMany(projectDocs);

  // -------------------------------------------------------------------------
  // Tasks — Project 1: Clinic Appointment System
  // 14 tasks: 5 todo, 4 in-progress, 5 done
  // Members: arjun, priya, daniel, sofia
  // -------------------------------------------------------------------------

  const t1: RawTask[] = [
    // --- todo (order 1-5) ---
    {
      _id: new mongoose.Types.ObjectId(),
      project: project1Id,
      title: "Set up doctor availability calendar",
      description: "Build the weekly availability grid where doctors can block or open time slots.",
      status: "todo",
      priority: "high",
      labels: ["Backend", "Frontend"],
      assignee: priya._id,
      order: 1,
      dueDate: daysAgo(3), // overdue
      createdAt: daysAgo(20),
      updatedAt: daysAgo(3),
      createdBy: arjun._id,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      project: project1Id,
      title: "Add SMS reminder integration",
      description: "Integrate Twilio to send appointment reminders 24 hours before the booking.",
      status: "todo",
      priority: "medium",
      labels: ["Backend"],
      assignee: daniel._id,
      order: 2,
      dueDate: daysAgo(1), // overdue
      createdAt: daysAgo(18),
      updatedAt: daysAgo(2),
      createdBy: arjun._id,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      project: project1Id,
      title: "Design patient registration form",
      description: "Create the onboarding form collecting name, DOB, NHS number, and contact details.",
      status: "todo",
      priority: "medium",
      labels: ["Design", "Frontend"],
      assignee: sofia._id,
      order: 3,
      dueDate: daysFromNow(5),
      createdAt: daysAgo(15),
      updatedAt: daysAgo(5),
      createdBy: arjun._id,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      project: project1Id,
      title: "Write API documentation for booking endpoints",
      description: "Document all REST endpoints using OpenAPI 3.0 so the mobile team can integrate.",
      status: "todo",
      priority: "low",
      labels: ["Docs"],
      order: 4,
      dueDate: daysFromNow(10),
      createdAt: daysAgo(12),
      updatedAt: daysAgo(12),
      createdBy: arjun._id,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      project: project1Id,
      title: "Implement multi-clinic support",
      description: "Extend the data model so a single patient can book across different clinic branches.",
      status: "todo",
      priority: "high",
      labels: ["Backend"],
      order: 5,
      createdAt: daysAgo(10),
      updatedAt: daysAgo(10),
      createdBy: arjun._id,
    },
    // --- in-progress (order 1-4) ---
    {
      _id: new mongoose.Types.ObjectId(),
      project: project1Id,
      title: "Build appointment booking flow",
      description: "Step-by-step UI for patients to pick a doctor, specialty, date, and time slot.",
      status: "in-progress",
      priority: "high",
      labels: ["Frontend", "Backend"],
      assignee: priya._id,
      order: 1,
      dueDate: daysFromNow(3),
      createdAt: daysAgo(22),
      updatedAt: daysAgo(1),
      createdBy: arjun._id,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      project: project1Id,
      title: "Implement JWT auth for patients",
      description: "Patients log in via email and OTP; issue short-lived JWTs on success.",
      status: "in-progress",
      priority: "high",
      labels: ["Backend"],
      assignee: daniel._id,
      order: 2,
      dueDate: daysFromNow(4),
      createdAt: daysAgo(21),
      updatedAt: daysAgo(2),
      createdBy: arjun._id,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      project: project1Id,
      title: "Dashboard: upcoming appointments widget",
      description: "Show the next 3 appointments on the doctor's home screen with quick-action buttons.",
      status: "in-progress",
      priority: "medium",
      labels: ["Frontend"],
      assignee: sofia._id,
      order: 3,
      dueDate: daysFromNow(7),
      createdAt: daysAgo(16),
      updatedAt: daysAgo(1),
      createdBy: arjun._id,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      project: project1Id,
      title: "Fix double-booking race condition",
      description: "Two concurrent requests can reserve the same slot. Introduce optimistic locking.",
      status: "in-progress",
      priority: "high",
      labels: ["Bug", "Backend"],
      assignee: arjun._id,
      order: 4,
      dueDate: daysFromNow(2),
      createdAt: daysAgo(8),
      updatedAt: daysAgo(1),
      createdBy: arjun._id,
    },
    // --- done (order 1-5) ---
    {
      _id: new mongoose.Types.ObjectId(),
      project: project1Id,
      title: "Set up MongoDB Atlas cluster",
      description: "Provision a shared M10 cluster, create indexes, and configure IP allowlist.",
      status: "done",
      priority: "medium",
      labels: ["Backend"],
      assignee: arjun._id,
      order: 1,
      completedAt: daysAgo(13),
      createdAt: daysAgo(27),
      updatedAt: daysAgo(13),
      createdBy: arjun._id,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      project: project1Id,
      title: "Define database schema for bookings",
      description: "ERD covering Patients, Doctors, Clinics, Slots, and Appointments collections.",
      status: "done",
      priority: "medium",
      labels: ["Backend", "Docs"],
      assignee: daniel._id,
      order: 2,
      completedAt: daysAgo(11),
      createdAt: daysAgo(26),
      updatedAt: daysAgo(11),
      createdBy: arjun._id,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      project: project1Id,
      title: "Create project repo and CI pipeline",
      description: "GitHub repo with branch protection, lint, and test steps in GitHub Actions.",
      status: "done",
      priority: "low",
      labels: [],
      assignee: priya._id,
      order: 3,
      completedAt: daysAgo(10),
      createdAt: daysAgo(25),
      updatedAt: daysAgo(10),
      createdBy: arjun._id,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      project: project1Id,
      title: "Design system: colour tokens and typography",
      description: "Finalise NHS-accessible palette and type scale, publish as a Figma library.",
      status: "done",
      priority: "medium",
      labels: ["Design"],
      assignee: sofia._id,
      order: 4,
      completedAt: daysAgo(7),
      createdAt: daysAgo(24),
      updatedAt: daysAgo(7),
      createdBy: arjun._id,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      project: project1Id,
      title: "Write user stories and acceptance criteria",
      description: "Cover booking, cancellation, rescheduling, and notification scenarios.",
      status: "done",
      priority: "medium",
      labels: ["Docs"],
      assignee: priya._id,
      order: 5,
      completedAt: daysAgo(5),
      createdAt: daysAgo(23),
      updatedAt: daysAgo(5),
      createdBy: arjun._id,
    },
  ];

  // -------------------------------------------------------------------------
  // Tasks — Project 2: Brand Refresh
  // 8 tasks: 3 todo, 2 in-progress, 3 done
  // Members: priya, sofia, lena
  // -------------------------------------------------------------------------

  const t2: RawTask[] = [
    // todo (1-3)
    {
      _id: new mongoose.Types.ObjectId(),
      project: project2Id,
      title: "Photograph new product range for brand shoot",
      description: "Coordinate studio day; capture hero shots for website and social assets.",
      status: "todo",
      priority: "medium",
      labels: ["Design"],
      assignee: sofia._id,
      order: 1,
      dueDate: daysFromNow(8),
      createdAt: daysAgo(14),
      updatedAt: daysAgo(5),
      createdBy: priya._id,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      project: project2Id,
      title: "Update email templates with new branding",
      description: "Apply revised logo, colours, and footer to all transactional email templates.",
      status: "todo",
      priority: "medium",
      labels: ["Design", "Frontend"],
      assignee: lena._id,
      order: 2,
      dueDate: daysAgo(2), // overdue
      createdAt: daysAgo(12),
      updatedAt: daysAgo(3),
      createdBy: priya._id,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      project: project2Id,
      title: "Write brand voice guidelines",
      description: "Define tone-of-voice principles, dos and don'ts, and sample copy for marketing.",
      status: "todo",
      priority: "low",
      labels: ["Docs"],
      order: 3,
      dueDate: daysFromNow(14),
      createdAt: daysAgo(10),
      updatedAt: daysAgo(10),
      createdBy: priya._id,
    },
    // in-progress (1-2)
    {
      _id: new mongoose.Types.ObjectId(),
      project: project2Id,
      title: "Redesign logo variants",
      description: "Deliver primary, horizontal, and icon-only versions in SVG and PNG.",
      status: "in-progress",
      priority: "high",
      labels: ["Design"],
      assignee: sofia._id,
      order: 1,
      dueDate: daysFromNow(6),
      createdAt: daysAgo(18),
      updatedAt: daysAgo(1),
      createdBy: priya._id,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      project: project2Id,
      title: "Build brand guidelines PDF",
      description: "Compile colour palette, typeface rules, logo usage, and imagery style into one doc.",
      status: "in-progress",
      priority: "medium",
      labels: ["Design", "Docs"],
      assignee: priya._id,
      order: 2,
      dueDate: daysFromNow(9),
      createdAt: daysAgo(16),
      updatedAt: daysAgo(2),
      createdBy: priya._id,
    },
    // done (1-3)
    {
      _id: new mongoose.Types.ObjectId(),
      project: project2Id,
      title: "Audit existing brand assets",
      description: "Inventory all current logos, colours, and fonts across marketing collateral.",
      status: "done",
      priority: "medium",
      labels: [],
      assignee: priya._id,
      order: 1,
      completedAt: daysAgo(12),
      createdAt: daysAgo(19),
      updatedAt: daysAgo(12),
      createdBy: priya._id,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      project: project2Id,
      title: "Competitor brand analysis",
      description: "Research top 5 competitors; document visual differentiation opportunities.",
      status: "done",
      priority: "low",
      labels: ["Docs"],
      assignee: lena._id,
      order: 2,
      completedAt: daysAgo(9),
      createdAt: daysAgo(18),
      updatedAt: daysAgo(9),
      createdBy: priya._id,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      project: project2Id,
      title: "Select final colour palette",
      description: "Shortlist 3 palettes from the mood board review; get stakeholder sign-off.",
      status: "done",
      priority: "high",
      labels: ["Design"],
      assignee: sofia._id,
      order: 3,
      completedAt: daysAgo(6),
      createdAt: daysAgo(17),
      updatedAt: daysAgo(6),
      createdBy: priya._id,
    },
  ];

  // -------------------------------------------------------------------------
  // Tasks — Project 3: Office Move Q1
  // 5 tasks: 2 todo, 1 in-progress, 2 done
  // Members: daniel, lena
  // -------------------------------------------------------------------------

  const t3: RawTask[] = [
    // todo (1-2)
    {
      _id: new mongoose.Types.ObjectId(),
      project: project3Id,
      title: "Arrange IT equipment delivery",
      description: "Coordinate with the vendor to schedule delivery of 12 desktops and network switches.",
      status: "todo",
      priority: "high",
      labels: [],
      assignee: lena._id,
      order: 1,
      dueDate: daysFromNow(4),
      createdAt: daysAgo(12),
      updatedAt: daysAgo(4),
      createdBy: daniel._id,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      project: project3Id,
      title: "Notify staff of move schedule",
      description: "Send all-hands email with floor plan, moving day timeline, and FAQ.",
      status: "todo",
      priority: "medium",
      labels: [],
      order: 2,
      dueDate: daysFromNow(6),
      createdAt: daysAgo(11),
      updatedAt: daysAgo(11),
      createdBy: daniel._id,
    },
    // in-progress (1)
    {
      _id: new mongoose.Types.ObjectId(),
      project: project3Id,
      title: "Configure network on new floor",
      description: "Set up VLANs, switch ports, and wireless access points in the new office space.",
      status: "in-progress",
      priority: "high",
      labels: ["Backend"],
      assignee: daniel._id,
      order: 1,
      dueDate: daysFromNow(3),
      createdAt: daysAgo(10),
      updatedAt: daysAgo(2),
      createdBy: daniel._id,
    },
    // done (1-2)
    {
      _id: new mongoose.Types.ObjectId(),
      project: project3Id,
      title: "Create office floor plan",
      description: "Draft seating layout for 20 engineers; share with facilities for sign-off.",
      status: "done",
      priority: "medium",
      labels: [],
      assignee: lena._id,
      order: 1,
      completedAt: daysAgo(8),
      createdAt: daysAgo(13),
      updatedAt: daysAgo(8),
      createdBy: daniel._id,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      project: project3Id,
      title: "Book moving company",
      description: "Get 3 quotes, compare insurance, and confirm date with chosen provider.",
      status: "done",
      priority: "medium",
      labels: [],
      assignee: daniel._id,
      order: 2,
      completedAt: daysAgo(4),
      createdAt: daysAgo(13),
      updatedAt: daysAgo(4),
      createdBy: daniel._id,
    },
  ];

  const allTaskDocs = [...t1, ...t2, ...t3];
  await Task.collection.insertMany(allTaskDocs);

  // -------------------------------------------------------------------------
  // Comments — 12 total, authors are project members only
  // -------------------------------------------------------------------------

  // Named references into task arrays (indices match the order declared above).
  const taskBookingFlow   = t1[5];  // in-progress
  const taskJwtAuth       = t1[6];  // in-progress
  const taskDoublebook    = t1[8];  // in-progress
  const taskAtlasSetup    = t1[9];  // done
  const taskSchemaDefine  = t1[10]; // done
  const taskSetupCalendar = t1[0];  // todo
  const taskLogoRedesign  = t2[3];  // in-progress
  const taskBrandPdf      = t2[4];  // in-progress
  const taskAudit         = t2[5];  // done
  const taskNetworkConfig = t3[2];  // in-progress

  const commentDocs = [
    // Project 1 (members: arjun, priya, daniel, sofia)
    {
      _id: new mongoose.Types.ObjectId(),
      task: taskBookingFlow._id,
      author: priya._id,
      text: "I have the date-picker working. Moving on to the slot availability logic next.",
      createdAt: daysAgo(6),
      updatedAt: daysAgo(6),
    },
    {
      _id: new mongoose.Types.ObjectId(),
      task: taskBookingFlow._id,
      author: arjun._id,
      text: "Make sure the slot endpoint returns times in UTC so the frontend can localise correctly.",
      createdAt: daysAgo(5),
      updatedAt: daysAgo(5),
    },
    {
      _id: new mongoose.Types.ObjectId(),
      task: taskJwtAuth._id,
      author: daniel._id,
      text: "OTP generation is done. Blocked on the email delivery config. Waiting for credentials.",
      createdAt: daysAgo(4),
      updatedAt: daysAgo(4),
    },
    {
      _id: new mongoose.Types.ObjectId(),
      task: taskDoublebook._id,
      author: arjun._id,
      text: "Reproduced with 50 concurrent requests against staging. Adding a MongoDB transaction.",
      createdAt: daysAgo(3),
      updatedAt: daysAgo(3),
    },
    {
      _id: new mongoose.Types.ObjectId(),
      task: taskDoublebook._id,
      author: daniel._id,
      text: "Can we also add a unique compound index on (slot, appointmentDate) as an extra guard?",
      createdAt: daysAgo(2),
      updatedAt: daysAgo(2),
    },
    {
      _id: new mongoose.Types.ObjectId(),
      task: taskSetupCalendar._id,
      author: priya._id,
      text: "Starting on this. Will prototype with a simple week-view grid before touching the API.",
      createdAt: daysAgo(2),
      updatedAt: daysAgo(2),
    },
    {
      _id: new mongoose.Types.ObjectId(),
      task: taskAtlasSetup._id,
      author: arjun._id,
      text: "Cluster is live. Connection string shared in 1Password under ProjectFlow/Atlas.",
      createdAt: daysAgo(13),
      updatedAt: daysAgo(13),
    },
    {
      _id: new mongoose.Types.ObjectId(),
      task: taskSchemaDefine._id,
      author: daniel._id,
      text: "ERD uploaded to Notion. Let me know if we need to add a Referrals collection.",
      createdAt: daysAgo(11),
      updatedAt: daysAgo(11),
    },
    // Project 2 (members: priya, sofia, lena)
    {
      _id: new mongoose.Types.ObjectId(),
      task: taskLogoRedesign._id,
      author: sofia._id,
      text: "Three concepts ready for review in Figma. Option B is my recommendation.",
      createdAt: daysAgo(4),
      updatedAt: daysAgo(4),
    },
    {
      _id: new mongoose.Types.ObjectId(),
      task: taskBrandPdf._id,
      author: priya._id,
      text: "Great work on the logo options. Once stakeholders sign off I will drop them into the PDF.",
      createdAt: daysAgo(3),
      updatedAt: daysAgo(3),
    },
    {
      _id: new mongoose.Types.ObjectId(),
      task: taskAudit._id,
      author: lena._id,
      text: "Found 6 different logo versions in use across channels. We really need this refresh.",
      createdAt: daysAgo(12),
      updatedAt: daysAgo(12),
    },
    // Project 3 (members: daniel, lena)
    {
      _id: new mongoose.Types.ObjectId(),
      task: taskNetworkConfig._id,
      author: lena._id,
      text: "The wireless survey flagged a dead zone near the meeting rooms. Added a second AP to the plan.",
      createdAt: daysAgo(2),
      updatedAt: daysAgo(2),
    },
  ];

  await Comment.collection.insertMany(commentDocs);

  // -------------------------------------------------------------------------
  // Notifications for demo user 1 (arjun) — 5 total, 2 read
  // Messages match the format built by src/lib/notifications.ts.
  // -------------------------------------------------------------------------

  const notificationDocs = [
    // 1. Priya assigned arjun to the double-booking task (read)
    {
      _id: new mongoose.Types.ObjectId(),
      user: arjun._id,
      actor: priya._id,
      type: "assigned" as const,
      project: project1Id,
      task: taskDoublebook._id,
      message: buildMessage("assigned", priya.name, taskDoublebook.title),
      read: true,
      createdAt: daysAgo(8),
      updatedAt: daysAgo(8),
    },
    // 2. Daniel commented on the JWT auth task (read)
    {
      _id: new mongoose.Types.ObjectId(),
      user: arjun._id,
      actor: daniel._id,
      type: "comment" as const,
      project: project1Id,
      task: taskJwtAuth._id,
      message: buildMessage("comment", daniel.name, taskJwtAuth.title),
      read: true,
      createdAt: daysAgo(4),
      updatedAt: daysAgo(4),
    },
    // 3. Priya assigned arjun to the Atlas setup task (unread)
    {
      _id: new mongoose.Types.ObjectId(),
      user: arjun._id,
      actor: priya._id,
      type: "assigned" as const,
      project: project1Id,
      task: taskAtlasSetup._id,
      message: buildMessage("assigned", priya.name, taskAtlasSetup.title),
      read: false,
      createdAt: daysAgo(3),
      updatedAt: daysAgo(3),
    },
    // 4. Sofia commented on the booking flow task (unread)
    {
      _id: new mongoose.Types.ObjectId(),
      user: arjun._id,
      actor: sofia._id,
      type: "comment" as const,
      project: project1Id,
      task: taskBookingFlow._id,
      message: buildMessage("comment", sofia.name, taskBookingFlow.title),
      read: false,
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
    // 5. Daniel added arjun to Office Move Q1 (unread)
    {
      _id: new mongoose.Types.ObjectId(),
      user: arjun._id,
      actor: daniel._id,
      type: "added_to_project" as const,
      project: project3Id,
      message: buildMessage("added_to_project", daniel.name, "Office Move Q1"),
      read: false,
      createdAt: daysAgo(14),
      updatedAt: daysAgo(14),
    },
  ];

  await Notification.collection.insertMany(notificationDocs);

  // -------------------------------------------------------------------------
  // Verify and print counts
  // -------------------------------------------------------------------------

  const userCount    = await User.countDocuments({ email: { $regex: `${DEMO_DOMAIN}$` } });
  const projectCount = await Project.countDocuments({ owner: { $in: userDocs.map((u) => u._id) } });
  const taskCount    = await Task.countDocuments({ project: { $in: [project1Id, project2Id, project3Id] } });
  const commentCount = await Comment.countDocuments({ task: { $in: allTaskDocs.map((t) => t._id) } });
  const notifCount   = await Notification.countDocuments({ user: arjun._id });

  console.log("\n-- Seed complete --\n");
  console.log("Collection     Count");
  console.log("\u2500".repeat(22));
  console.log(`users          ${userCount}`);
  console.log(`projects       ${projectCount}`);
  console.log(`tasks          ${taskCount}`);
  console.log(`comments       ${commentCount}`);
  console.log(`notifications  ${notifCount}`);
  console.log("");
  console.log(`Demo password:  ${DEMO_PASSWORD}\n`);
  console.log("Demo accounts:");
  for (const u of userDocs) {
    console.log(`  ${u.email}`);
  }
  console.log("");
}

// ---------------------------------------------------------------------------
// Entrypoint
// ---------------------------------------------------------------------------

// Pass "remove" as the first CLI argument to run seed:remove.
const command = process.argv[2];

async function main(): Promise<void> {
  await connectToDatabase();

  const db = mongoose.connection.db;
  if (!db) throw new Error("No database connection after connectToDatabase().");

  // Print DB name and host only — never the full URI or credentials.
  console.log(`Database: ${db.databaseName}  Host: ${mongoose.connection.host}`);

  await removeDemoData();

  if (command === "remove") {
    console.log("\n-- Remove complete --");
  } else {
    await insertDemoData();
  }

  await mongoose.disconnect();
}

main().catch((err: unknown) => {
  console.error("Seed failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
