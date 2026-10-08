export interface User {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
}

export interface ProjectMemberUser {
  _id: string;
  name: string;
  email: string;
}

export interface ProjectMember {
  user: ProjectMemberUser;
  role: "owner" | "member";
}

export type TaskPriority = "low" | "medium" | "high";

export interface Project {
  _id: string;
  name: string;
  description?: string;
  owner: string;
  members: ProjectMember[];
  taskCount?: number;
  doneCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthMeResponse {
  user: User;
}

export interface AuthLoginResponse {
  user: User;
}

export interface AuthRegisterResponse {
  user: User;
}

export interface ProjectsListResponse {
  projects: Project[];
}

export interface ProjectDetailResponse {
  project: Project;
}

export interface ApiErrorResponse {
  error: string;
}

export type TaskStatus = "todo" | "in-progress" | "done";

export interface TaskUser {
  _id: string;
  name: string;
  email: string;
}

export interface Task {
  _id: string;
  project: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority?: TaskPriority;
  labels?: string[];
  commentCount?: number;
  assignee?: TaskUser | null;
  order: number;
  dueDate?: string | null;
  createdBy: TaskUser | string;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  _id: string;
  task: string;
  author: TaskUser;
  text: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TasksListResponse {
  tasks: Task[];
}

export interface TaskResponse {
  task: Task;
}

export interface CommentsListResponse {
  comments: Comment[];
}

export interface CommentResponse {
  comment: Comment;
}

