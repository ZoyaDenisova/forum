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
  author: string; // ID автора (для проверок)
  authorName: string; // Имя автора (для отображения)
  description: string; 
  createdAt: string; // Дата создания в формате ISO
}

export interface TopicMessage {
  id: string;
  topicId: string;
  author: string; // ID автора (для проверок)
  authorName: string; // Имя автора (для отображения)
  content: string;
  createdAt: string;
  // parentMessageId?: string;
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