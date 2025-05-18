import type { Category, Topic, TopicMessage, ChatMessage, MessageAuthor } from '@/types/forum';
import type { User } from '@/types/auth'; // Предполагаем, что User импортируется

const mockCategories: Category[] = [
  {
    id: '1',
    name: 'Игры',
    description: 'Обсуждение компьютерных и видеоигр',
  },
  {
    id: '2',
    name: 'Кино',
    description: 'Новинки кинопроката, классика и сериалы',
  },
  {
    id: '3',
    name: 'Музыка',
    description: 'Различные жанры, исполнители и альбомы',
  },
  {
    id: '4',
    name: 'Программирование',
    description: 'Вопросы по разработке, языкам и технологиям',
  },
];

// Имитация API-запроса для получения категорий
export const fetchCategories = async (): Promise<Category[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockCategories);
    }, 500); // Имитация задержки сети
  });
};

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
  return new Promise((resolve) => {
    setTimeout(() => {
      const topics = mockTopics.filter(topic => topic.categoryId === categoryId);
      resolve(topics);
    }, 700); // Имитация задержки сети
  });
};

// Имитация API-запроса для получения данных одной категории (может понадобиться для заголовка)
export const fetchCategoryById = async (categoryId: string): Promise<Category | undefined> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockCategories.find(cat => cat.id === categoryId));
    }, 300);
  });
};

// Имитация API-запроса для получения данных одной темы по ID
export const fetchTopicById = async (topicId: string): Promise<Topic | undefined> => {
  console.log("API: fetching topic by id", topicId);
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
    if (Math.random() < 0.80) { // 15% шанс получить новое сообщение каждые 5 секунд
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
      const categoryExists = mockCategories.some(cat => cat.id === payload.categoryId);
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
    author: mockSystemAuthor,
    createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(), // 10 минут назад
  },
  {
    id: 'gm3',
    text: 'Какие планы на сегодня?',
    author: mockUserAuthor2,
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 минут назад
  },
];

const GENERAL_MESSAGES_PAGE_SIZE = 15; // Количество сообщений на страницу для "бесконечного скролла"

// Имитация API для получения сообщений общего чата с пагинацией (для бесконечного скролла)
export const fetchGeneralMessages = async (page: number = 1): Promise<{ messages: ChatMessage[], hasMore: boolean }> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const sortedMessages = [...mockGeneralMessages].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const startIndex = (page - 1) * GENERAL_MESSAGES_PAGE_SIZE;
      const endIndex = startIndex + GENERAL_MESSAGES_PAGE_SIZE;
      const paginatedMessages = sortedMessages.slice(startIndex, endIndex);
      const hasMore = endIndex < sortedMessages.length;
      
      // Для чата обычно сообщения сортируются от старых к новым для отображения
      resolve({ messages: paginatedMessages.sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()), hasMore });
    }, 400);
  });
};

// Эмуляция WebSocket для общего чата
const generalChatSubscriptions = new Map<string, ((message: ChatMessage) => void)[]>();
const GENERAL_CHAT_KEY = 'general'; // Ключ для подписок на общий чат
let generalMessageCounter = mockGeneralMessages.length + 1;

export const subscribeToGeneralChatMessages = (callback: (message: ChatMessage) => void) => {
  if (!generalChatSubscriptions.has(GENERAL_CHAT_KEY)) {
    generalChatSubscriptions.set(GENERAL_CHAT_KEY, []);
  }
  generalChatSubscriptions.get(GENERAL_CHAT_KEY)!.push(callback);
  console.log('WS: Subscribed to general chat messages');

  // Имитация случайных новых сообщений (можно убрать, если мешает отладке)
  const intervalId = setInterval(() => {
    if (Math.random() < 0.9) { // 10% шанс на новое сообщение каждые 7 секунд
      const randomAuthor = Math.random() > 0.5 ? mockUserAuthor1 : mockUserAuthor2;
      const newMessage: ChatMessage = {
        id: `gm_auto_${generalMessageCounter++}`,
        text: `Случайное сообщение №${generalMessageCounter -1} из общего чата. Lorem ipsum. `,
        author: randomAuthor,
        createdAt: new Date().toISOString(),
      };
      mockGeneralMessages.push(newMessage);
      generalChatSubscriptions.get(GENERAL_CHAT_KEY)?.forEach(cb => cb(newMessage));
      console.log('WS: Sent new mock general chat message:', newMessage);
    }
  }, 7000);

  return () => {
    const subscribers = generalChatSubscriptions.get(GENERAL_CHAT_KEY)?.filter(cb => cb !== callback);
    if (subscribers && subscribers.length > 0) {
      generalChatSubscriptions.set(GENERAL_CHAT_KEY, subscribers);
    } else {
      generalChatSubscriptions.delete(GENERAL_CHAT_KEY);
    }
    clearInterval(intervalId);
    console.log('WS: Unsubscribed from general chat messages');
  };
};

interface SendGeneralMessagePayload {
  text: string;
  author: MessageAuthor; // Ожидаем полного автора, т.к. на клиенте он будет известен
}

export const sendGeneralMessage = async (payload: SendGeneralMessagePayload): Promise<ChatMessage> => {
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
      generalChatSubscriptions.get(GENERAL_CHAT_KEY)?.forEach(callback => callback(newMessage));
      resolve(newMessage);
    }, 150);
  });
};

// --- Админские функции для категорий ---
let categoryIdCounter = mockCategories.length > 0 ? Math.max(...mockCategories.map(c => parseInt(c.id, 10))) + 1 : 1;

interface AddCategoryPayload {
  name: string;
  description: string;
}

// Имитация API для добавления категории
export const addCategory = async (payload: AddCategoryPayload): Promise<Category> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newCategory: Category = {
        id: `${categoryIdCounter++}`,
        name: payload.name,
        description: payload.description,
        // topicCount и postCount можно инициализировать нулями или не добавлять в мок, если они не обязательны сразу
      };
      mockCategories.push(newCategory); // Добавляем в наш моковый массив
      console.log('API: Added category', newCategory);
      console.log('API: Current mockCategories', mockCategories);
      resolve(newCategory);
    }, 500);
  });
};

// Имитация API для удаления категории
export const deleteCategory = async (categoryId: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const index = mockCategories.findIndex(cat => cat.id === categoryId);
      if (index !== -1) {
        // Перед удалением категории, убедимся, что нет тем, связанных с ней (или удалим их тоже)
        // В данном случае, для упрощения, просто удаляем категорию
        mockCategories.splice(index, 1);
        resolve();
      } else {
        reject(new Error('Категория не найдена'));
      }
    }, 300);
  });
};

// --- Функции для управления темами (заглушки) ---
interface AddTopicPayload {
  categoryId: string;
  title: string;
  description: string;
  author: string; // В будущем это будет User ID из AuthContext
}

export const addTopic = async (payload: AddTopicPayload): Promise<Topic> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const categoryExists = mockCategories.some(cat => cat.id === payload.categoryId);
      if (!categoryExists) {
        return reject(new Error('Категория не найдена'));
      }
      const newTopic: Topic = {
        id: `t${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, // Уникальный ID
        categoryId: payload.categoryId,
        title: payload.title,
        description: payload.description,
        author: payload.author,
        createdAt: new Date().toISOString(),
      };
      mockTopics.unshift(newTopic); // Добавляем в начало
      resolve(newTopic);
    }, 500);
  });
};

export const deleteTopic = async (categoryId: string, topicId: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const index = mockTopics.findIndex(topic => topic.id === topicId && topic.categoryId === categoryId);
      if (index !== -1) {
        mockTopics.splice(index, 1);
        // Также нужно удалить все сообщения этой темы
        mockTopicMessages = mockTopicMessages.filter(msg => msg.topicId !== topicId);
        resolve();
      } else {
        reject(new Error('Тема не найдена или не принадлежит указанной категории'));
      }
    }, 500);
  });
};

// --- Функции для управления сообщениями в темах (заглушки) ---
interface EditMessagePayload {
  topicId: string;
  messageId: string;
  newContent: string;
}

export const editTopicMessage = async (payload: EditMessagePayload): Promise<TopicMessage> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const messageIndex = mockTopicMessages.findIndex(msg => msg.id === payload.messageId && msg.topicId === payload.topicId);
      if (messageIndex !== -1) {
        mockTopicMessages[messageIndex].content = payload.newContent;
        // В реальном приложении можно добавить поле updatedAt
        // mockTopicMessages[messageIndex].updatedAt = new Date().toISOString(); 
        resolve(mockTopicMessages[messageIndex]);
      } else {
        reject(new Error('Сообщение не найдено или не принадлежит указанной теме'));
      }
    }, 300);
  });
};

export const deleteTopicMessage = async (topicId: string, messageId: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const initialLength = mockTopicMessages.length;
      mockTopicMessages = mockTopicMessages.filter(msg => !(msg.id === messageId && msg.topicId === topicId));
      if (mockTopicMessages.length < initialLength) {
        resolve();
      } else {
        reject(new Error('Сообщение не найдено или не принадлежит указанной теме для удаления'));
      }
    }, 300);
  });
};

// Заглушка для API получения всех пользователей (для админки)
// ... existing code ... 