import type { 
  LoginRequest, 
  RegisterRequest, 
  TokenResponse, 
  AuthErrorResponse,
  UpdateUserRequest,
  SessionResponse,
  User
} from '@/types/auth';

const API_BASE_URL = '/api/auth'; // Изменяем BASE_URL, чтобы соответствовать новому ключу прокси

// Общий обработчик ответов API
async function handleApiResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) { // No Content
    return undefined as T;
  }

  let responseData;
  try {
    // Попытка получить JSON, даже если это ошибка, т.к. тело ошибки тоже может быть JSON
    responseData = await response.json();
  } catch (error) {
    // Если тело ответа не JSON, но статус ошибки, создаем ошибку на основе статуса
    if (!response.ok) {
      throw new Error(`Ошибка сервера: ${response.status} ${response.statusText}. Ответ не в формате JSON.`);
    }
    // Если response.ok, но не JSON (например, текстовый ответ для 201 Register), 
    // это будет обработано в вызывающей функции.
    // Здесь, если response.ok и нет JSON, предполагаем, что это нештатная ситуация для этого generic-обработчика,
    // но лучше дать специфичной логике решить.
    // Если мы дошли сюда и response.ok, и нет JSON, вернем undefined или null.
    // Однако, если Content-Type был application/json, response.json() должен был сработать или выдать ошибку.
    // Этот блок catch скорее для не-JSON ответов, которые не должны были сюда попасть при response.ok.
    return undefined as T; // Или можно выбросить ошибку, если JSON строго ожидался
  }

  if (!response.ok) {
    const apiError = responseData as AuthErrorResponse;
    throw new Error(apiError?.message || `Неизвестная ошибка API: ${response.status}`);
  }

  return responseData as T;
}

// Вход пользователя
export async function loginUser(credentials: LoginRequest): Promise<TokenResponse> {
  const response = await fetch(`${API_BASE_URL}/login`, {
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
  const token = localStorage.getItem('accessToken');
  if (!token) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/me`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (response.status === 401) {
      localStorage.removeItem('accessToken');
      return null;
    }
    return await handleApiResponse<User>(response);
  } catch (error) {
    console.error('Ошибка при получении данных пользователя (fetchCurrentUser):', error);
    localStorage.removeItem('accessToken'); // Удаляем токен при любой ошибке запроса профиля
    return null;
  }
}

// Выход пользователя - попытка инвалидировать сессию на сервере
export async function logoutUserOnServer(): Promise<void> {
  // const token = localStorage.getItem('accessToken'); // Токен здесь не используется для запроса
  
  // Вызов этого эндпоинта - это "лучшее усилие" для инвалидации серверной сессии,
  // которая, согласно Swagger, управляется HttpOnly cookie (refresh_token).
  const response = await fetch(`${API_BASE_URL}/session`, { // Swagger: DELETE /auth/session
    method: 'DELETE',
    credentials: 'include',
  });

  // Мы не считаем ошибкой, если сессии уже нет (401, 404)
  if (!response.ok && response.status !== 401 && response.status !== 404) {
    console.warn(`logoutUserOnServer: Не удалось корректно завершить сессию на сервере: ${response.status} ${response.statusText}`);
    // Можно рассмотреть вариант выброса ошибки, если это критично, но для logout обычно нет.
    // throw new Error(`Server session logout failed: ${response.status}`);
  }
}

// Регистрация нового пользователя (согласно swagger, ответ 201 - строка)
export async function registerUser(userData: RegisterRequest): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });

  // Если не OK, handleApiResponse выбросит ошибку (если тело JSON)
  // или мы должны обработать текстовую ошибку здесь, если тело ошибки не JSON.
  // Но handleApiResponse уже пытается это сделать.
  if (!response.ok) {
     // Попытаемся извлечь AuthErrorResponse, если это JSON
     try {
        const errorData = await response.json() as AuthErrorResponse;
        throw new Error(errorData.message || `Ошибка регистрации: ${response.status}`);
     } catch (e) {
        // Если тело ошибки не JSON
        throw new Error(`Ошибка регистрации: ${response.status} ${response.statusText}`);
     }
  }

  // Для успешного ответа 201, swagger ожидает строку
  if (response.status === 201) {
    return response.text(); 
  }
  
  // Если дошли сюда с response.ok, но не 201, это неожиданно для /auth/register
  // Можно вернуть пустую строку или выбросить ошибку
  console.warn('Регистрация: получен неожиданный успешный статус:', response.status);
  return response.text(); // Или выбросить ошибку, что более правильно
}

export async function refreshToken(): Promise<TokenResponse> {
  // Этот эндпоинт /auth/refresh использует HttpOnly cookie для refresh token
  const response = await fetch(`${API_BASE_URL}/refresh`, {
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
  const token = localStorage.getItem('accessToken');
  if (!token) {
    throw new Error('Пользователь не аутентифицирован для обновления профиля.');
  }
  const response = await fetch(`${API_BASE_URL}/user`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });
  // PATCH /auth/user возвращает 204 No Content
  await handleApiResponse<void>(response);
}

export async function listUserSessions(): Promise<SessionResponse[]> {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    // Swagger для /auth/sessions не указывает BearerAuth, значит он ожидает cookie
    // Но это странно, если это список сессий ТЕКУЩЕГО пользователя, токен должен быть.
    // Уточнить этот момент. Если cookie, то Authorization не нужен.
    // Если Bearer, то нужен.
    // Пока сделаем с токеном, так как это более распространенная практика для /me/sessions
     throw new Error('Пользователь не аутентифицирован для просмотра сессий.');
  }
  const response = await fetch(`${API_BASE_URL}/sessions`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return handleApiResponse<SessionResponse[]>(response);
}

export async function revokeAllUserSessions(): Promise<void> {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    // Аналогично listUserSessions, swagger не указывает BearerAuth для DELETE /auth/sessions
    // Предполагаем, что токен нужен.
    throw new Error('Пользователь не аутентифицирован для удаления всех сессий.');
  }
  const response = await fetch(`${API_BASE_URL}/sessions`, {
    method: 'DELETE',
    headers: {
       'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  // DELETE /auth/sessions возвращает 204 No Content
  await handleApiResponse<void>(response);
}

// TODO: Нужна функция для получения данных текущего пользователя (getMe).
// OpenAPI схема не предоставляет явного эндпоинта GET /auth/user.
// Возможно, данные пользователя нужно получать из accessToken (если это JWT с payload)
// или после логина/рефреша делать дополнительный запрос, если такой эндпоинт есть, но не описан.
// Или же PATCH /auth/user при успешном ответе может возвращать обновленного пользователя в теле (не по схеме).
// Пока оставим это место для будущего расширения. 