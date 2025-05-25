export interface Category {
  id: string;
  name: string;
  description: string;
  // icon?: string; // Пока опционально, можем добавить позже
}

export interface Topic {
  id: string;
  categoryId: string; // Связь с категорией
  title: string;
  // Описание темы
  author: string; // Имя автора, в будущем может быть User ID/объект
  // Описание темы, не первый пост
  description: string; 
  createdAt: string; // Дата создания в формате ISO
}

export interface TopicMessage {
  id: string;
  topicId: string;
  author: string; // Имя автора, в будущем User ID/объект
  content: string; // Переименуем в content для единообразия с TopicMessage
  createdAt: string; // Дата создания в формате ISO
  // parentMessageId?: string; // Для ответов на сообщения, пока не реализуем
}

// Тип для автора сообщения, может быть переиспользован
export interface MessageAuthor {
  id: string | number;
  name: string;
  // avatarUrl?: string; // Если понадобится аватар
}

export interface ChatMessage {
  id: string;
  text: string;       // Текст сообщения
  author: MessageAuthor; // Автор сообщения
  createdAt: string;    // Дата создания в формате ISO
} 