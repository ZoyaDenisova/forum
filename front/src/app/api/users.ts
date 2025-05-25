import type { User } from '@/types/auth';

let mockApiUsers: User[] = [
  {
    id: '1',
    name: 'Alice Wonderland',
    email: 'alice@example.com',
    role: 'admin',
    created_at: new Date('2023-01-15T10:00:00Z').toISOString(),
  },
  {
    id: '2',
    name: 'Bob The Builder',
    email: 'bob@example.com',
    role: 'user',
    created_at: new Date('2023-02-20T11:30:00Z').toISOString(),
  },
  {
    id: '3',
    name: 'Charlie Brown',
    email: 'charlie@example.com',
    role: 'user',
    created_at: new Date('2023-03-10T12:15:00Z').toISOString(),
  },
  {
    id: '4',
    name: 'Diana Prince',
    email: 'diana@example.com',
    role: 'user',
    created_at: new Date('2023-04-05T09:05:00Z').toISOString(),
  },
];

export const fetchAllUsers = async (): Promise<User[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(JSON.parse(JSON.stringify(mockApiUsers)));
    }, 500);
  });
};

export const deleteUser = async (userId: string | number): Promise<void> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const initialLength = mockApiUsers.length;
      // @ts-ignore // id в User может быть string | number, обеспечиваем сравнение
      mockApiUsers = mockApiUsers.filter(user => user.id.toString() !== userId.toString());
      if (mockApiUsers.length < initialLength) {
        resolve();
      } else {
        reject(new Error('Пользователь не найден или не удален'));
      }
    }, 300);
  });
};

interface UpdateUserPayload {
  name: string;
  email: string;
  role: string;
}

export const updateUser = async (userId: string | number, userData: UpdateUserPayload): Promise<User> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const userIndex = mockApiUsers.findIndex(user => user.id.toString() === userId.toString());
      if (userIndex === -1) {
        return reject(new Error('Пользователь не найден'));
      }
      
      const updatedUser: User = { 
        ...mockApiUsers[userIndex], 
        name: userData.name,
        email: userData.email,
        role: userData.role,
      };
      
      mockApiUsers[userIndex] = updatedUser;
      resolve(updatedUser);
    }, 300);
  });
};

// TODO: Функции для управления пользователями
// export const toggleUserActiveStatus = async (userId: string): Promise<User> => { ... }
// // export const deleteUser = async (userId: string): Promise<void> => { ... } 