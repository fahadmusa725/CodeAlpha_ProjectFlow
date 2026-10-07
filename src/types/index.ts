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

export interface Project {
  _id: string;
  name: string;
  description?: string;
  owner: string;
  members: ProjectMember[];
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
