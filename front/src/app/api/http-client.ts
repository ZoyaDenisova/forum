import { refreshToken } from './auth';

const API_BASE_URL = '/api';

// Флаг для отслеживания, выполняется ли в данный момент обновление токена
let isRefreshing = false;
// Очередь колбэков для запросов, ожидающих обновления токена
let refreshSubscribers: Array<(token: string) => void> = [];

// Функция для добавления запроса в очередь ожидания
function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

// Функция для выполнения всех ожидающих запросов с новым токеном
function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach(callback => callback(token));
  refreshSubscribers = [];
}

// Функция для очистки очереди в случае ошибки
function onRefreshError() {
  refreshSubscribers = [];
}

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Добавляем базовый URL если путь относительный
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  
  // Получаем текущий токен
  const token = localStorage.getItem('accessToken');
  
  // Добавляем заголовки
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  // Выполняем запрос
  let response = await fetch(fullUrl, {
    ...options,
    headers,
  });

  // Если получаем 401 с сообщением "invalid token", пробуем обновить токен
  if (response.status === 401) {
    try {
      const errorData = await response.json();
      if (errorData.message === 'invalid token') {
        // Если уже идет обновление токена, ждем его завершения
        if (isRefreshing) {
          return new Promise(resolve => {
            subscribeTokenRefresh(token => {
              headers['Authorization'] = `Bearer ${token}`;
              resolve(fetch(fullUrl, { ...options, headers }));
            });
          });
        }

        isRefreshing = true;

        try {
          // Пробуем обновить токен
          const refreshResult = await refreshToken();
          const newToken = refreshResult.access_token;
          
          isRefreshing = false;
          
          // Обновляем заголовок для текущего запроса
          headers['Authorization'] = `Bearer ${newToken}`;
          
          // Уведомляем подписчиков о новом токене
          onTokenRefreshed(newToken);
          
          // Повторяем оригинальный запрос с новым токеном
          return fetch(fullUrl, { ...options, headers });
        } catch (error) {
          isRefreshing = false;
          onRefreshError();
          // Если не удалось обновить токен, удаляем его
          localStorage.removeItem('accessToken');
          throw error;
        }
      }
    } catch (error) {
      // Если не удалось распарсить JSON ответ, просто возвращаем оригинальный ответ
      return response;
    }
  }

  return response;
} 