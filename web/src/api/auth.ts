/**
 * Authentication API
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3333';

export interface User {
  id: number;
  email: string;
  created_at: string;
}

export interface AuthStatus {
  users_registered: number;
  max_users: number;
  slots_available: number;
  accepting_signups: boolean;
}

export interface AuthResponse {
  message: string;
  user: User;
}

export interface ErrorResponse {
  error: string;
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data as T;
}

export async function signup(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<AuthResponse>(response);
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  return handleResponse<AuthResponse>(response);
}

export async function logout(): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
  return handleResponse<{ message: string }>(response);
}

export async function getCurrentUser(): Promise<{ user: User }> {
  const response = await fetch(`${API_BASE}/api/auth/me`, {
    credentials: 'include',
  });
  return handleResponse<{ user: User }>(response);
}

export async function getAuthStatus(): Promise<AuthStatus> {
  const response = await fetch(`${API_BASE}/api/auth/status`);
  return handleResponse<AuthStatus>(response);
}
