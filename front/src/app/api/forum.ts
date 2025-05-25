import type { Category, Topic, TopicMessage, ChatMessage, MessageAuthor } from '@/types/forum';
import type { User } from '@/types/auth'; // Предполагаем, что User импортируется
import { fetchWithAuth } from './http-client';

// Базовый URL вашего API
const API_BASE_URL = '/api';

// Helper to get JWT token from localStorage
const getToken = (): string | null => {
  // Пытаемся получить токен напрямую по ключу 'accessToken'
  const token = localStorage.getItem('accessToken'); 
  if (token) {
    return token;
  }
  
  // Оставим старую логику на случай, если где-то используется ключ 'auth'
  // Но приоритет отдадим 'accessToken'
  console.warn("accessToken not found directly, trying 'auth' key with a token property.");
  const authData = localStorage.getItem('auth');
  if (authData) {
    try {
      const parsedAuthData = JSON.parse(authData);
      return parsedAuthData.token || null; 
    } catch (e) {
      console.error("Failed to parse auth data from localStorage with 'auth' key", e);
      return null;
    }
  }
  return null;
};


// Типы из Swagger (можно вынести в отдельный файл или генерировать)
interface ApiCategoryResponse {
  id: number;
  title: string;
  description: string;
}

interface ApiCreateCategoryRequest {
  title: string;
  description: string;
}

// Функция для маппинга ответа API к типу Category нашего фронтенда
// На данный момент Category ожидает id: string, name: string. Swagger: id: number, title: string
// Адаптируем наш тип Category или эту функцию.
// Для совместимости, пока будем мапить title -> name и id -> id.toString()
// В идеале, нужно будет обновить тип Category в src/types/forum.ts
const mapApiCategoryToCategory = (apiCat: ApiCategoryResponse): Category => ({
  id: apiCat.id.toString(), // Конвертируем id в строку для совместимости с текущим типом Category
  name: apiCat.title,        // Маппим title на name
  description: apiCat.description,
});


// Обновленная функция для получения категорий с сервера
export const fetchCategories = async (): Promise<Category[]> => {
  const response = await fetchWithAuth(`/categories`);
  if (!response.ok) {
    // Можно добавить более детальную обработку ошибок на основе статуса ответа
    throw new Error('Failed to fetch categories');
  }
  const apiCategories: ApiCategoryResponse[] = await response.json();
  return apiCategories.map(mapApiCategoryToCategory);
};

// // Старый mockCategories - больше не нужен для fetchCategories
// const mockCategories: Category[] = [
//   {
//     id: '1',
//     name: 'Игры',
//     description: 'Обсуждение компьютерных и видеоигр',
//   },
//   // ... другие мок-категории
// ];

// --- Существующие моки для тем и сообщений пока оставим без изменений ---
// ... (весь код с mockTopics, fetchTopicsByCategoryId, mockTopicMessages и т.д. остается здесь)
// ... существующий код ...


// Имитация API-запроса для получения тем по ID категории
export const fetchTopicsByCategoryId = async (categoryId: string): Promise<Topic[]> => {
  const numericCategoryId = parseInt(categoryId, 10);
  if (isNaN(numericCategoryId)) {
    throw new Error('Invalid category ID format for fetching topics.');
  }
  const response = await fetchWithAuth(`/categories/${numericCategoryId}/topics`);
  if (!response.ok) {
    throw new Error(`Failed to fetch topics for category ${categoryId}`);
  }
  const apiTopics: ApiTopicResponse[] = await response.json();
  return apiTopics.map(mapApiTopicToTopic);
};

// Имитация API-запроса для получения данных одной категории (может понадобиться для заголовка)
export const fetchCategoryById = async (categoryId: string): Promise<Category | undefined> => {
  // Эта функция тоже должна будет работать с API, если будет использоваться
  // Пока оставим как есть или закомментируем, если не используется активно
  console.warn("fetchCategoryById is using mock data or needs API integration");
  const response = await fetchWithAuth(`/categories/${categoryId}`);
  if (!response.ok) {
    if (response.status === 404) return undefined;
    throw new Error(`Failed to fetch category ${categoryId}`);
  }
  const apiCategory: ApiCategoryResponse = await response.json();
  return mapApiCategoryToCategory(apiCategory);
  // return new Promise((resolve) => {
  //   setTimeout(() => {
  //     resolve(mockCategories.find(cat => cat.id === categoryId));
  //   }, 300);
  // });
};

// Имитация API-запроса для получения данных одной темы по ID
export const fetchTopicById = async (topicId: string): Promise<Topic | undefined> => {
  console.log("API: fetching topic by id", topicId);
  const numericTopicId = parseInt(topicId, 10);
  if (isNaN(numericTopicId)) {
    console.error('Invalid topic ID format for fetchTopicById:', topicId);
    // Можно вернуть undefined или выбросить ошибку, в зависимости от ожидаемого поведения
    return undefined; 
  }

  const response = await fetchWithAuth(`/topics/${numericTopicId}`);
  if (!response.ok) {
    if (response.status === 404) {
      console.warn(`API: Topic with id ${topicId} not found (404).`);
      return undefined;
    }
    const errorText = await response.text().catch(() => 'Failed to read error response');
    console.error(`API: Failed to fetch topic ${topicId}. Status: ${response.status}. Body: ${errorText}`);
    throw new Error(`Failed to fetch topic ${topicId}. Status: ${response.status}`);
  }
  // ApiTopicResponse уже определен и используется в mapApiTopicToTopic
  const apiTopic: ApiTopicResponse = await response.json(); 
  console.log("API: fetched topic data", apiTopic);
  return mapApiTopicToTopic(apiTopic);
};

// --- Сообщения в темах ---

// DTO из swagger.json для сообщений
interface TopicMessageDto {
  id: number;
  author_id: number;
  author_name: string;
  content: string;
  created_at: string;
  // topic_id отсутствует в TopicMessageDto, будем добавлять его из параметра функции
}

interface CreateTopicMessageDto {
  content: string;
}

interface UpdateTopicMessageDto {
  content: string;
}

// Универсальный парсер времени: принимает число (секунды или миллисекунды) или строку, возвращает ISO-строку
function parseToIsoString(ts: string | number): string {
  if (typeof ts === 'number') {
    // Если число меньше 1e12 — это секунды, иначе миллисекунды
    const ms = ts < 1e12 ? ts * 1000 : ts;
    return new Date(ms).toISOString();
  }
  if (typeof ts === 'string' && /^\d+$/.test(ts)) {
    // Строка-число
    const num = Number(ts);
    const ms = num < 1e12 ? num * 1000 : num;
    return new Date(ms).toISOString();
  }
  // Если это уже ISO-строка или что-то другое — пробуем как есть
  return new Date(ts).toISOString();
}

// Функция для маппинга TopicMessageDto к TopicMessage (фронтенд тип)
const mapApiTopicMessageToTopicMessage = (apiMsg: TopicMessageDto, topicId: string): TopicMessage => ({
  id: apiMsg.id.toString(),
  topicId: topicId,
  author: apiMsg.author_id.toString(),
  authorName: apiMsg.author_name,
  content: apiMsg.content,
  createdAt: parseToIsoString(apiMsg.created_at),
});


let mockTopicMessages: TopicMessage[] = [
  {
    id: 'tm1',
    topicId: 't1',
    author: '1',
    authorName: 'AdminHelper',
    content: 'Попробуйте проверить целостность файлов игры в Steam.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 1.5).toISOString(),
  },
  {
    id: 'tm2',
    topicId: 't1',
    author: '1',
    authorName: 'User 1',
    content: 'Проверил, не помогло :(',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(),
  },
  {
    id: 'tm3',
    topicId: 't3',
    author: '3',
    authorName: 'User 3',
    content: 'Фильм просто пушка! Визуал и звук на высоте.',
    createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
  },
];

export const fetchMessagesByTopicId = async (topicId: string): Promise<TopicMessage[]> => {
  console.log(`API: fetching messages for topic ${topicId}`);
  const numericTopicId = parseInt(topicId, 10);
  if (isNaN(numericTopicId)) {
    console.error('Invalid topic ID format for fetchMessagesByTopicId:', topicId);
    return []; // или throw new Error
  }

  const response = await fetchWithAuth(`/topics/${numericTopicId}/messages`);
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Failed to read error response');
    console.error(`API: Failed to fetch messages for topic ${topicId}. Status: ${response.status}. Body: ${errorText}`);
    throw new Error(`Failed to fetch messages for topic ${topicId}. Status: ${response.status}`);
  }
  const apiMessages: TopicMessageDto[] = await response.json();
  console.log(`API: fetched ${apiMessages.length} messages for topic ${topicId}`);
  return apiMessages.map(apiMsg => mapApiTopicMessageToTopicMessage(apiMsg, topicId));
};

// Имитация WebSocket подписки
const topicSubscriptions = new Map<string, ((message: TopicMessage) => void)[]>();
let messageCounter = mockTopicMessages.length + 1;

// В реальном приложении это был бы один WebSocket connection, который мультиплексировал бы каналы тем
// Здесь для простоты мы будем эмулировать отдельные "потоки" для каждой темы

export const subscribeToTopicMessages = (topicId: string, callback: (message: TopicMessage) => void) => {
  console.log(`WS: Subscribing to messages for topic ${topicId} (MOCK IMPLEMENTATION)`);
  if (!topicSubscriptions.has(topicId)) {
    topicSubscriptions.set(topicId, []);
  }
  topicSubscriptions.get(topicId)!.push(callback);

  // Имитация случайных новых сообщений от других пользователей
  // В реальном приложении это не нужно, сообщения будут приходить от сервера
  const intervalId = setInterval(() => {
    if (Math.random() < 0.05) { // Уменьшим частоту для тестов
      const newMessage: TopicMessage = {
        id: `tm_auto_${messageCounter++}`,
        topicId,
        author: `RandomUser${Math.floor(Math.random() * 100)}`,
        authorName: `RandomUser${Math.floor(Math.random() * 100)}`,
        content: `Это случайно сгенерированное сообщение №${messageCounter -1} для темы ${topicId}. Lorem ipsum dolor sit amet. `,
        createdAt: new Date().toISOString(),
      };
      // mockTopicMessages.push(newMessage); // Не нужно добавлять в mockTopicMessages, если API реально работает
      topicSubscriptions.get(topicId)?.forEach(cb => cb(newMessage));
      console.log(`WS: Sent new mock message to topic ${topicId}:`, newMessage);
    }
  }, 5000);

  return () => {
    console.log(`WS: Unsubscribing from messages for topic ${topicId} (MOCK IMPLEMENTATION)`);
    const subscribers = topicSubscriptions.get(topicId)?.filter(cb => cb !== callback);
    if (subscribers && subscribers.length > 0) {
      topicSubscriptions.set(topicId, subscribers);
    } else {
      topicSubscriptions.delete(topicId);
    }
    clearInterval(intervalId); // Очищаем интервал, связанный с этой конкретной подпиской
  };
};

export const sendTopicMessage = async (
  topicId: string, 
  messageData: { author: string; content: string }
): Promise<TopicMessage> => {
  console.log(`API: Sending message to topic ${topicId}`, { content: messageData.content });
  const numericTopicId = parseInt(topicId, 10);

  if (isNaN(numericTopicId)) {
    console.error('Invalid topic ID format for sendTopicMessage:', topicId);
    throw new Error('Invalid topic ID format.');
  }

  const apiRequestBody: CreateTopicMessageDto = {
    content: messageData.content,
  };

  const response = await fetchWithAuth(`/topics/${numericTopicId}/messages`, {
    method: 'POST',
    body: JSON.stringify(apiRequestBody),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Failed to read error response');
    console.error(`API: Failed to send message to topic ${topicId}. Status: ${response.status}. Body: ${errorText}`);
    throw new Error(`Failed to send message. Status: ${response.status}`);
  }
  
  const newApiMessage: TopicMessageDto = await response.json();
  return mapApiTopicMessageToTopicMessage(newApiMessage, topicId);
};

// --- Добавляем функцию создания темы ---


// --- Общий чат ---
const mockSystemAuthor: MessageAuthor = { id: 'system', name: 'Система' };
const mockUserAuthor1: MessageAuthor = { id: 'user1', name: 'Alice' };
const mockUserAuthor2: MessageAuthor = { id: 'user2', name: 'Bob' };

let mockGeneralMessages: ChatMessage[] = [
  {
    id: 'gm1',
    text: 'Всем привет в общем чате!',
    author: mockUserAuthor1,
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 минут назад
  },
  {
    id: 'gm2',
    text: 'Добро пожаловать на форум!',
    author: mockUserAuthor2,
    createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(), // 10 минут назад
  },
  {
    id: 'gm3',
    text: 'Какие планы на выходные?',
    author: mockUserAuthor1,
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 минут назад
  },
];

// Имитация API-запроса для получения сообщений общего чата с пагинацией
// Допустим, по 10 сообщений на страницу
const GENERAL_MESSAGES_PER_PAGE = 10;

export const fetchGeneralMessages = async (page: number = 1): Promise<{ messages: ChatMessage[], hasMore: boolean }> => {
  console.log(`API: Fetching general messages page ${page}`);
  return new Promise((resolve) => {
    setTimeout(() => {
      // Сортируем сообщения по дате (старые сначала)
      const sortedMessages = [...mockGeneralMessages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const startIndex = (page - 1) * GENERAL_MESSAGES_PER_PAGE;
      const endIndex = startIndex + GENERAL_MESSAGES_PER_PAGE;
      const paginatedMessages = sortedMessages.slice(startIndex, endIndex);
      const hasMore = endIndex < sortedMessages.length;
      resolve({ messages: paginatedMessages, hasMore });
    }, 500);
  });
};

// Имитация WebSocket подписки на общий чат
let generalChatCallbacks: ((message: ChatMessage) => void)[] = [];
let generalMessageCounter = mockGeneralMessages.length + 1;

export const subscribeToGeneralChatMessages = (callback: (message: ChatMessage) => void) => {
  console.log('WS: Subscribing to general chat');
  generalChatCallbacks.push(callback);

  const intervalId = setInterval(() => {
    if (Math.random() < 0.1) { // 10% шанс нового сообщения каждые 3 секунды
      const newMessage: ChatMessage = {
        id: `gm_auto_${generalMessageCounter++}`,
        text: `Случайное сообщение в общем чате №${generalMessageCounter -1}`,
        author: Math.random() > 0.5 ? mockUserAuthor1 : mockUserAuthor2,
        createdAt: new Date().toISOString(),
      };
      mockGeneralMessages.push(newMessage);
      generalChatCallbacks.forEach(cb => cb(newMessage));
    }
  }, 3000);

  return () => {
    console.log('WS: Unsubscribing from general chat');
    generalChatCallbacks = generalChatCallbacks.filter(cb => cb !== callback);
    clearInterval(intervalId);
  };
};

interface SendGeneralMessagePayload {
  text: string;
  author: MessageAuthor; // Ожидаем полного автора, т.к. на клиенте он будет известен
}
export const sendGeneralMessage = async (payload: SendGeneralMessagePayload): Promise<ChatMessage> => {
  console.log('API/WS: Sending general message', payload);
  return new Promise((resolve) => {
    setTimeout(() => {
      const newMessage: ChatMessage = {
        id: `gm${generalMessageCounter++}`,
        text: payload.text,
        author: payload.author,
        createdAt: new Date().toISOString(),
      };
      mockGeneralMessages.push(newMessage);
      // Уведомляем всех подписчиков общего чата
      generalChatCallbacks.forEach(callback => callback(newMessage));
      resolve(newMessage);
    }, 150);
  });
};


// Payload для функции addCategory
// Swagger ожидает title и description
interface AddCategoryPayload {
  name: string; // Будет title в запросе к API
  description: string;
}

// Обновленная функция для добавления категории
export const addCategory = async (payload: AddCategoryPayload): Promise<Category> => {
  const apiRequestBody: ApiCreateCategoryRequest = {
    title: payload.name,
    description: payload.description,
  };

  const response = await fetchWithAuth('/categories', {
    method: 'POST',
    body: JSON.stringify(apiRequestBody),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error("Failed to add category:", errorData);
    throw new Error(`Failed to add category. Status: ${response.status}. Message: ${errorData}`);
  }
  
  const newApiCategory: ApiCategoryResponse = await response.json();
  return mapApiCategoryToCategory(newApiCategory);
};

// Обновленная функция для удаления категории
export const deleteCategory = async (categoryId: string): Promise<void> => {
  const numericCategoryId = parseInt(categoryId, 10);
  if (isNaN(numericCategoryId)) {
    throw new Error('Invalid category ID format for deletion.');
  }

  const response = await fetchWithAuth(`/categories/${numericCategoryId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error("Failed to delete category:", errorData);
    throw new Error(`Failed to delete category. Status: ${response.status}. Message: ${errorData}`);
  }
};


// --- Функции для управления темами ---

interface ApiTopicResponse {
  id: number;
  category_id: number;
  author_id: number;
  author_name: string;
  title: string;
  description: string;
  created_at: string;
}

interface ApiCreateTopicRequest {
  category_id: number;
  title: string;
  description: string;
}

// Функция для маппинга ответа API к типу Topic нашего фронтенда
const mapApiTopicToTopic = (apiTopic: ApiTopicResponse): Topic => ({
  id: apiTopic.id.toString(),
  categoryId: apiTopic.category_id.toString(),
  title: apiTopic.title,
  author: apiTopic.author_id.toString(),
  authorName: apiTopic.author_name,
  description: apiTopic.description,
  createdAt: apiTopic.created_at,
});

// Обновляем AddTopicPayload, чтобы он больше соответствовал тому, что может предоставить фронтенд
// author будет браться из токена на бэке, так что с фронта его передавать не нужно в API
interface AddTopicPayload {
  categoryId: string; // Будет преобразован в number для API
  title: string;
  description: string;
  // author: string; // Больше не нужен здесь, т.к. API его не принимает в теле запроса
}

// Обновленная функция для добавления темы
export const addTopic = async (payload: AddTopicPayload): Promise<Topic> => {
  const numericCategoryId = parseInt(payload.categoryId, 10);
  if (isNaN(numericCategoryId)) {
    throw new Error('Invalid categoryId for addTopic');
  }

  const apiRequestBody: ApiCreateTopicRequest = {
    category_id: numericCategoryId,
    title: payload.title,
    description: payload.description,
  };

  const response = await fetchWithAuth('/topics', {
    method: 'POST',
    body: JSON.stringify(apiRequestBody),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error("Failed to add topic:", errorData);
    throw new Error(`Failed to add topic. Status: ${response.status}. Message: ${errorData}`);
  }
  const newApiTopic: ApiTopicResponse = await response.json();
  return mapApiTopicToTopic(newApiTopic);
};

// Обновленная функция для удаления темы
// API DELETE /topics/{id} ожидает только topicId
export const deleteTopic = async (topicId: string): Promise<void> => {
  const numericTopicId = parseInt(topicId, 10);
  if (isNaN(numericTopicId)) {
    throw new Error('Invalid topic ID format for deletion.');
  }

  const response = await fetchWithAuth(`/topics/${numericTopicId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error("Failed to delete topic:", errorData);
    throw new Error(`Failed to delete topic. Status: ${response.status}. Message: ${errorData}`);
  }
};


interface EditMessagePayload {
  topicId: string; // Не нужен для API endpoint /messages/{id}, но может быть полезен для консистентности payload
  messageId: string;
  newContent: string;
}

export const editTopicMessage = async (payload: EditMessagePayload): Promise<void> => {
  console.log(`API: Editing message ${payload.messageId}`, { newContent: payload.newContent });
  const numericMessageId = parseInt(payload.messageId, 10);

  if (isNaN(numericMessageId)) {
    console.error('Invalid message ID format for editTopicMessage:', payload.messageId);
    throw new Error('Invalid message ID format.');
  }

  const apiRequestBody: UpdateTopicMessageDto = {
    content: payload.newContent,
  };

  const response = await fetchWithAuth(`/messages/${numericMessageId}`, {
    method: 'PUT',
    body: JSON.stringify(apiRequestBody),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Failed to read error response');
    console.error(`API: Failed to edit message ${payload.messageId}. Status: ${response.status}. Body: ${errorText}`);
    throw new Error(`Failed to edit message. Status: ${response.status}`);
  }

  if (response.status === 204) {
    return;
  }
};

export const deleteTopicMessage = async (topicId: string, messageId: string): Promise<void> => {
  console.log(`API: Deleting message ${messageId} from topic ${topicId}`);
  const numericMessageId = parseInt(messageId, 10);

  if (isNaN(numericMessageId)) {
    console.error('Invalid message ID format for deleteTopicMessage:', messageId);
    throw new Error('Invalid message ID format.');
  }

  const response = await fetchWithAuth(`/messages/${numericMessageId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    if (response.status === 404) {
        console.warn(`API: Message ${messageId} not found for deletion (404). Assuming already deleted.`);
        return;
    }
    const errorText = await response.text().catch(() => 'Failed to read error response');
    console.error(`API: Failed to delete message ${messageId}. Status: ${response.status}. Body: ${errorText}`);
    throw new Error(`Failed to delete message. Status: ${response.status}`);
  }
  console.log(`API: Message ${messageId} deleted successfully.`);
};

// --- Функция для редактирования топика ---
interface EditTopicPayload {
  title: string;
  description: string;
}

export const editTopic = async (topicId: string, payload: EditTopicPayload): Promise<void> => {
  const numericTopicId = parseInt(topicId, 10);
  if (isNaN(numericTopicId)) {
    throw new Error('Invalid topic ID format for editTopic');
  }
  const apiRequestBody = {
    title: payload.title,
    description: payload.description,
  };
  const response = await fetchWithAuth(`/topics/${numericTopicId}`, {
    method: 'PUT',
    body: JSON.stringify(apiRequestBody),
  });
  if (!response.ok) {
    const errorData = await response.text();
    console.error('Failed to edit topic:', errorData);
    throw new Error(`Failed to edit topic. Status: ${response.status}. Message: ${errorData}`);
  }
};

// --- WebSocket для топика ---
/**
 * Подключение к WebSocket для топика
 * @param topicId string | number
 * @param handlers { onMessage, onOpen, onClose, onError }
 * @returns disconnect(): void
 */
export function connectToTopicWebSocket(
  topicId: string | number,
  handlers: {
    onMessage: (data: { action: 'created' | 'updated'; message: import('@/types/forum').TopicMessage } | { action: 'deleted'; message_id: string }) => void,
    onOpen?: () => void,
    onClose?: (ev: CloseEvent) => void,
    onError?: (ev: Event) => void,
  }
) {
  const token = localStorage.getItem('accessToken');
  const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const wsHost = window.location.host;
  const wsUrl = `${wsProtocol}://${wsHost}/ws/topics/${topicId}`;
  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    if (handlers.onOpen) handlers.onOpen();
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handlers.onMessage(data);
  };

  ws.onclose = (ev) => {
    if (handlers.onClose) handlers.onClose(ev);
  };

  ws.onerror = (ev) => {
    if (handlers.onError) handlers.onError(ev);
  };

  return () => {
    ws.close();
  };
}

// --- ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ ДАТЫ ИЗ WEBSOCKET ---
function normalizeIsoDateString(iso: string): string {
  if (typeof iso !== 'string') return '';
  return iso.replace(/(\.\d{3})\d*(Z)/, '$1$2');
}

/**
 * Подключение к WebSocket для общего чата (topicId=1)
 * @param handlers { onMessage, onOpen, onClose, onError }
 * @returns disconnect(): void
 */
export function connectToGeneralChatWebSocket(
  handlers: {
    onMessage: (data: { action: 'created' | 'updated'; message: import('@/types/forum').ChatMessage } | { action: 'deleted'; message_id: string }) => void,
    onOpen?: () => void,
    onClose?: (ev: CloseEvent) => void,
    onError?: (ev: Event) => void,
  }
) {
  const token = localStorage.getItem('accessToken');
  const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const wsHost = window.location.host;
  const wsUrl = `${wsProtocol}://${wsHost}/ws/topics/1`;
  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    if (handlers.onOpen) handlers.onOpen();
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handlers.onMessage(data);
  };

  ws.onclose = (ev) => {
    if (handlers.onClose) handlers.onClose(ev);
  };

  ws.onerror = (ev) => {
    if (handlers.onError) handlers.onError(ev);
  };

  return () => {
    ws.close();
  };
}

// Убедимся, что все экспорты на месте
// fetchCategories, addCategory, deleteCategory - обновлены
// fetchTopicsByCategoryId, fetchCategoryById, fetchTopicById - пока моки или частично API
// addTopic, deleteTopic - пока моки
// fetchMessagesByTopicId, subscribeToTopicMessages, sendTopicMessage - моки/WS-эмуляция
// editTopicMessage, deleteTopicMessage - моки
// fetchGeneralMessages, subscribeToGeneralChatMessages, sendGeneralMessage - моKI/WS-эмуляция

// ... existing code ... 