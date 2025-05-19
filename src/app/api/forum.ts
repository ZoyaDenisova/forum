import type { Category, Topic, TopicMessage, ChatMessage, MessageAuthor } from '@/types/forum';
import type { User } from '@/types/auth'; // Предполагаем, что User импортируется

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
  const response = await fetch(`${API_BASE_URL}/categories`);
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
const mockTopics: Topic[] = [
  {
    id: 't1',
    categoryId: '1',
    title: 'CS — ошибка при заходе в игру',
    author: 'User123',
    description: 'При запуске CS получаю ошибку XYZ. Кто-нибудь сталкивался?',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 часа назад
  },
  {
    id: 't2',
    categoryId: '1',
    title: 'Лучшие моды для Cyberpunk 2077',
    author: 'CyberFan',
    description: 'Делимся находками лучших модификаций для CP2077.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 день назад
  },
  {
    id: 't3',
    categoryId: '2',
    title: 'Обсуждение нового фильма "Дюна: Часть вторая"',
    author: 'MovieGuru',
    description: 'Как вам новый фильм? Делитесь впечатлениями!',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 минут назад
  },
  {
    id: 't4',
    categoryId: '4',
    title: 'Вопрос по React Hooks: useEffect и зависимости',
    author: 'ReactDev',
    description: 'Не могу понять, как правильно указать зависимости для useEffect...',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 часов назад
  },
];

// Имитация API-запроса для получения тем по ID категории
export const fetchTopicsByCategoryId = async (categoryId: string): Promise<Topic[]> => {
  const numericCategoryId = parseInt(categoryId, 10);
  if (isNaN(numericCategoryId)) {
    throw new Error('Invalid category ID format for fetching topics.');
  }
  const response = await fetch(`${API_BASE_URL}/categories/${numericCategoryId}/topics`);
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
  const response = await fetch(`${API_BASE_URL}/categories/${categoryId}`);
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
  // TODO: Заменить на реальный API вызов, если нужно
  // const response = await fetch(`${API_BASE_URL}/topics/${topicId}`);
  // if (!response.ok) {
  //   if (response.status === 404) return undefined;
  //   throw new Error(`Failed to fetch topic ${topicId}`);
  // }
  // const apiTopic = await response.json(); // Нужен будет маппинг к Topic
  // return mapApiTopicToTopic(apiTopic)

  return new Promise((resolve) => {
    setTimeout(() => {
      const topic = mockTopics.find(t => t.id === topicId);
      console.log("API: found topic", topic);
      resolve(topic);
    }, 400); // Имитация задержки сети
  });
};

// --- Сообщения в темах ---
let mockTopicMessages: TopicMessage[] = [
  {
    id: 'tm1',
    topicId: 't1',
    author: 'AdminHelper',
    content: 'Попробуйте проверить целостность файлов игры в Steam.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 1.5).toISOString(),
  },
  {
    id: 'tm2',
    topicId: 't1',
    author: 'User123',
    content: 'Проверил, не помогло :(',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(),
  },
  {
    id: 'tm3',
    topicId: 't3',
    author: 'CinemaFan',
    content: 'Фильм просто пушка! Визуал и звук на высоте.',
    createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
  },
];

export const fetchMessagesByTopicId = async (topicId: string): Promise<TopicMessage[]> => {
  console.log(`API: fetching messages for topic ${topicId}`);
  // TODO: Заменить на реальный API вызов
  return new Promise((resolve) => {
    setTimeout(() => {
      const messages = mockTopicMessages.filter(msg => msg.topicId === topicId);
      resolve(messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
    }, 600);
  });
};

// Имитация WebSocket подписки
const topicSubscriptions = new Map<string, ((message: TopicMessage) => void)[]>();
let messageCounter = mockTopicMessages.length + 1;

// В реальном приложении это был бы один WebSocket connection, который мультиплексировал бы каналы тем
// Здесь для простоты мы будем эмулировать отдельные "потоки" для каждой темы

export const subscribeToTopicMessages = (topicId: string, callback: (message: TopicMessage) => void) => {
  console.log(`WS: Subscribing to messages for topic ${topicId}`);
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
        content: `Это случайно сгенерированное сообщение №${messageCounter -1} для темы ${topicId}. Lorem ipsum dolor sit amet. `,
        createdAt: new Date().toISOString(),
      };
      mockTopicMessages.push(newMessage);
      topicSubscriptions.get(topicId)?.forEach(cb => cb(newMessage));
      console.log(`WS: Sent new mock message to topic ${topicId}:`, newMessage);
    }
  }, 5000);

  return () => {
    console.log(`WS: Unsubscribing from messages for topic ${topicId}`);
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
  console.log(`API/WS: Sending message to topic ${topicId}`, messageData);
    // TODO: Заменить на реальный API вызов (POST /topics/{topicId}/messages)
  return new Promise((resolve) => {
    setTimeout(() => {
      const newMessage: TopicMessage = {
        id: `tm${messageCounter++}`,
        topicId,
        author: messageData.author, // В будущем здесь будет ID текущего пользователя
        content: messageData.content,
        createdAt: new Date().toISOString(),
      };
      mockTopicMessages.push(newMessage);
      // Уведомляем всех подписчиков этой темы
      topicSubscriptions.get(topicId)?.forEach(callback => callback(newMessage));
      resolve(newMessage);
    }, 200);
  });
};

// --- Добавляем функцию создания темы ---
interface CreateTopicPayload {
  title: string;
  description: string;
  categoryId: string;
  author: string; // Пока просто имя автора, в будущем может быть User ID
}

let topicIdCounter = mockTopics.length + 1; // Простой счетчик для ID новых тем

export const createTopic = async (payload: CreateTopicPayload): Promise<Topic> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Проверка, существует ли категория
      const categoryExists = mockTopics.some(topic => topic.categoryId === payload.categoryId);
      if (!categoryExists) {
        reject(new Error('Выбранная категория не существует.'));
        return;
      }

      const newTopic: Topic = {
        id: `t${topicIdCounter++}`,
        categoryId: payload.categoryId,
        title: payload.title,
        author: payload.author, // В реальном API это будет браться из сессии/токена
        description: payload.description,
        createdAt: new Date().toISOString(),
      };
      mockTopics.unshift(newTopic); // Добавляем в начало массива для наглядности
      resolve(newTopic);
    }, 300); // Имитация задержки сети
  });
};

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
  const token = getToken();
  const apiRequestBody: ApiCreateCategoryRequest = {
    title: payload.name, // Маппим name на title
    description: payload.description,
  };

  const response = await fetch(`${API_BASE_URL}/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
    body: JSON.stringify(apiRequestBody),
  });

  if (!response.ok) {
    // TODO: Обработать специфичные ошибки, например 400, 401
    const errorData = await response.text();
    console.error("Failed to add category:", errorData);
    throw new Error(`Failed to add category. Status: ${response.status}. Message: ${errorData}`);
  }
  
  const newApiCategory: ApiCategoryResponse = await response.json();
  return mapApiCategoryToCategory(newApiCategory);
};

// Обновленная функция для удаления категории
export const deleteCategory = async (categoryId: string): Promise<void> => {
  const token = getToken();
  // API ожидает числовой ID
  const numericCategoryId = parseInt(categoryId, 10);
  if (isNaN(numericCategoryId)) {
    throw new Error('Invalid category ID format for deletion.');
  }

  const response = await fetch(`${API_BASE_URL}/categories/${numericCategoryId}`, {
    method: 'DELETE',
    headers: {
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    // TODO: Обработать специфичные ошибки, например 404
    const errorData = await response.text();
    console.error("Failed to delete category:", errorData);
    throw new Error(`Failed to delete category. Status: ${response.status}. Message: ${errorData}`);
  }
  // DELETE обычно возвращает 204 No Content, тело ответа будет пустым
};


// --- Функции для управления темами ---

interface ApiTopicResponse {
  id: number;
  category_id: number;
  author_id: number;
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
  author: apiTopic.author_id.toString(), // Упрощение: используем ID автора как строку
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
  const token = getToken();
  const numericCategoryId = parseInt(payload.categoryId, 10);
  if (isNaN(numericCategoryId)) {
    throw new Error('Invalid categoryId for addTopic');
  }

  const apiRequestBody: ApiCreateTopicRequest = {
    category_id: numericCategoryId,
    title: payload.title,
    description: payload.description,
  };

  const response = await fetch(`${API_BASE_URL}/topics`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
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
  const token = getToken();
  const numericTopicId = parseInt(topicId, 10);
  if (isNaN(numericTopicId)) {
    throw new Error('Invalid topic ID format for deletion.');
  }

  const response = await fetch(`${API_BASE_URL}/topics/${numericTopicId}`, {
    method: 'DELETE',
    headers: {
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error("Failed to delete topic:", errorData);
    throw new Error(`Failed to delete topic. Status: ${response.status}. Message: ${errorData}`);
  }
  // DELETE обычно возвращает 204 No Content
};


interface EditMessagePayload {
  topicId: string; // Не нужен для API, если id сообщения уникален глобально
  messageId: string;
  newContent: string;
}

export const editTopicMessage = async (payload: EditMessagePayload): Promise<TopicMessage> => {
   // TODO: Заменить на реальный API вызов (PUT /messages/{id})
   // API ожидает content: string в теле. messageId в пути.
  console.warn("editTopicMessage is using mock data");
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const messageIndex = mockTopicMessages.findIndex(msg => msg.id === payload.messageId);
      if (messageIndex === -1) {
        return reject(new Error("Message not found"));
      }
      mockTopicMessages[messageIndex] = {
        ...mockTopicMessages[messageIndex],
        content: payload.newContent,
        // Обычно сервер обновляет и дату редактирования, здесь для простоты не делаем
      };
      resolve(mockTopicMessages[messageIndex]);
    }, 200);
  });
};

export const deleteTopicMessage = async (topicId: string, messageId: string): Promise<void> => {
  // TODO: Заменить на реальный API вызов (DELETE /messages/{id})
  // API ожидает messageId в пути. topicId не нужен.
  console.warn("deleteTopicMessage is using mock data");
  return new Promise((resolve) => {
    setTimeout(() => {
      // mockTopicMessages = mockTopicMessages.filter(msg => msg.id !== messageId);
      console.log(`Mock deletion of message ${messageId} from topic ${topicId}`);
      resolve();
    }, 200);
  });
};

// Заглушка для функции получения всех пользователей (для админки)
// В реальном приложении здесь был бы вызов к /users эндпоинту
export const fetchAllUsers = async (): Promise<User[]> => {
  console.warn("fetchAllUsers is using mock data");
  return new Promise((resolve) => {
    setTimeout(() => {
      // Примерные моковые данные
      resolve([
        { id: 'usr1', name: 'adminUser', email: 'admin@example.com', role: 'admin', created_at: new Date().toISOString() },
        { id: 'usr2', name: 'alice_wonder', email: 'alice@example.com', role: 'user', created_at: new Date().toISOString() },
        { id: 'usr3', name: 'bob_the_builder', email: 'bob@example.com', role: 'user', created_at: new Date().toISOString() },
        { id: 'usr4', name: 'charlie_brown', email: 'charlie@example.com', role: 'user', created_at: new Date().toISOString() },
      ]);
    }, 500);
  });
};

// Предположим, что у нас есть эндпоинт для обновления роли пользователя
// PUT /users/{userId}/role  с телом { role: "admin" | "user" }
export const updateUserRole = async (userId: string, newRole: 'admin' | 'user'): Promise<User> => {
  console.warn(`updateUserRole is using mock data for userId: ${userId}, newRole: ${newRole}`);
  // TODO: Заменить на реальный API вызов
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // В реальном приложении мы бы нашли пользователя в мок-данных и обновили его,
      // но здесь просто вернем "обновленного" пользователя для примера
      // Это чисто для имитации и не будет обновлять данные в fetchAllUsers
      const mockUpdatedUser: User = {
        id: userId,
        name: `user_${userId}`, // Заглушка, исправлено с username на name
        email: `${userId}@example.com`, // Заглушка
        role: newRole,
        created_at: new Date().toISOString()
      };
      resolve(mockUpdatedUser);
      // Если бы мы хотели обновить мок-данные в fetchAllUsers, нужно было бы найти пользователя
      // и изменить его роль, но это усложнит моки.
    }, 300);
  });
};

// Имитация API-запроса для создания темы (старая версия, возможно, дубликат)
// Эта функция createTopic кажется дублирует addTopic, но с другим payload.
// Оставим addTopic как основную.
// export const createTopic = async (payload: CreateTopicPayload): Promise<Topic> => { ... }

// Убедимся, что все экспорты на месте
// fetchCategories, addCategory, deleteCategory - обновлены
// fetchTopicsByCategoryId, fetchCategoryById, fetchTopicById - пока моки или частично API
// addTopic, deleteTopic - пока моки
// fetchMessagesByTopicId, subscribeToTopicMessages, sendTopicMessage - моки/WS-эмуляция
// editTopicMessage, deleteTopicMessage - моки
// fetchAllUsers, updateUserRole - моки
// fetchGeneralMessages, subscribeToGeneralChatMessages, sendGeneralMessage - моKI/WS-эмуляция

// ... existing code ... 