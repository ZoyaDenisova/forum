import type { 
  LoginRequest, 
  RegisterRequest, 
  TokenResponse, 
  AuthErrorResponse,
  UpdateUserRequest,
  SessionResponse,
  User
} from '@/types/auth';
import { fetchWithAuth } from './http-client';

const API_BASE_URL = '/auth';

// Общий обработчик ответов API
async function handleApiResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) { // No Content
    return undefined as T;
  }

  let responseData;
  try {
    responseData = await response.json();
  } catch (error) {
    if (!response.ok) {
      throw new Error(`Ошибка сервера: ${response.status} ${response.statusText}. Ответ не в формате JSON.`);
    }
    return undefined as T;
  }

  if (!response.ok) {
    const apiError = responseData as AuthErrorResponse;
    throw new Error(apiError?.message || `Неизвестная ошибка API: ${response.status}`);
  }

  return responseData as T;
}

// Вход пользователя
export async function loginUser(credentials: LoginRequest): Promise<TokenResponse> {
  const response = await fetch(`/api${API_BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  const data = await handleApiResponse<TokenResponse>(response);
  if (data.access_token) {
    localStorage.setItem('accessToken', data.access_token);
  }
  return data;
}

// Получение данных текущего пользователя (getMe)
export async function fetchCurrentUser(): Promise<User | null> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/me`);
    if (response.status === 401) {
      localStorage.removeItem('accessToken');
      return null;
    }
    return await handleApiResponse<User>(response);
  } catch (error) {
    console.error('Ошибка при получении данных пользователя (fetchCurrentUser):', error);
    localStorage.removeItem('accessToken');
    return null;
  }
}

// Выход пользователя - попытка инвалидировать сессию на сервере
export async function logoutUserOnServer(): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/session`, {
    method: 'DELETE',
    credentials: 'include',
  });

  // Мы не считаем ошибкой, если сессии уже нет (401, 404)
  if (!response.ok && response.status !== 401 && response.status !== 404) {
    console.warn(`logoutUserOnServer: Не удалось корректно завершить сессию на сервере: ${response.status} ${response.statusText}`);
  }
}

// Регистрация нового пользователя
export async function registerUser(userData: RegisterRequest): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
     try {
        const errorData = await response.json() as AuthErrorResponse;
        throw new Error(errorData.message || `Ошибка регистрации: ${response.status}`);
     } catch (e) {
        throw new Error(`Ошибка регистрации: ${response.status} ${response.statusText}`);
     }
  }

  if (response.status === 201) {
    return response.text(); 
  }
  
  console.warn('Регистрация: получен неожиданный успешный статус:', response.status);
  return response.text();
}

export async function refreshToken(): Promise<TokenResponse> {
  const response = await fetch(`/api${API_BASE_URL}/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });
  const data = await handleApiResponse<TokenResponse>(response);
  if (data.access_token) {
    localStorage.setItem('accessToken', data.access_token);
  }
  return data;
}

export async function updateUserProfile(userData: UpdateUserRequest): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/user`, {
    method: 'PATCH',
    body: JSON.stringify(userData),
  });
  await handleApiResponse<void>(response);
}

export async function listUserSessions(): Promise<SessionResponse[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}/sessions`);
  return handleApiResponse<SessionResponse[]>(response);
}

export async function revokeAllUserSessions(): Promise<void> {
  const response = await fetchWithAuth(`${API_BASE_URL}/sessions`, {
    method: 'DELETE',
  });
  await handleApiResponse<void>(response);
}

// TODO: Нужна функция для получения данных текущего пользователя (getMe).
// OpenAPI схема не предоставляет явного эндпоинта GET /auth/user.
// Возможно, данные пользователя нужно получать из accessToken (если это JWT с payload)
// или после логина/рефреша делать дополнительный запрос, если такой эндпоинт есть, но не описан.
// Или же PATCH /auth/user при успешном ответе может возвращать обновленного пользователя в теле (не по схеме).
// Пока оставим это место для будущего расширения. 