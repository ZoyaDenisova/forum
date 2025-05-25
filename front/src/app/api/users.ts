import type { User } from '@/types/auth';
import { fetchWithAuth } from './http-client';

export const fetchAllUsers = async (): Promise<User[]> => {
  const response = await fetchWithAuth('/users');
  if (!response.ok) {
    throw new Error('Ошибка загрузки пользователей');
  }
  return response.json();
};

export const blockUser = async (userId: string | number): Promise<void> => {
  const response = await fetchWithAuth(`/users/${userId}/block`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Ошибка блокировки пользователя');
  }
};

export const unblockUser = async (userId: string | number): Promise<void> => {
  const response = await fetchWithAuth(`/users/${userId}/unblock`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Ошибка разблокировки пользователя');
  }
};

// TODO: Функции для управления пользователями
// export const toggleUserActiveStatus = async (userId: string): Promise<User> => { ... }
// // export const deleteUser = async (userId: string): Promise<void> => { ... } 