export interface LoginRequest {
  email: string;
  password?: string; // Пароль может быть опциональным если это, например, OAuth или другой метод
}

export interface RegisterRequest {
  email: string;
  name: string;
  password?: string;
}

export interface TokenResponse {
  access_token: string;
}

export interface User {
  id: number | string; // В swagger id - integer, но может быть и uuid
  name: string;
  email: string;
  role: string; // Например, 'user', 'admin'
  created_at: string;
}

export interface AuthErrorResponse {
  code?: string;
  message: string;
}

// Если будут сессии
export interface SessionResponse {
  id: number;
  user_agent: string;
  created_at: string;
  expires_at: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
} 