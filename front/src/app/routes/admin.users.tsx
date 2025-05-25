import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAllUsers, blockUser, unblockUser } from '@/app/api/users';
import type { User } from '@/types/auth';
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Edit3, Trash2, Lock, Unlock } from 'lucide-react';
import { toast } from "sonner";
import { useState, useEffect } from 'react';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const userEditSchema = z.object({
  name: z.string().min(2, { message: "Имя должно содержать не менее 2 символов" }),
  email: z.string().email({ message: "Некорректный формат email" }),
  role: z.string().min(1, { message: "Роль должна быть выбрана" }), 
});
type UserEditFormData = z.infer<typeof userEditSchema>;

export const Route = createFileRoute('/admin/users')({
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const queryClient = useQueryClient();
  const { data: users, isLoading, error } = useQuery<User[], Error>({
    queryKey: ['allUsers'], 
    queryFn: fetchAllUsers
  });

  const blockUserMutation = useMutation({
    mutationFn: (userId: string | number) => blockUser(userId),
    onSuccess: () => {
      toast.success('Пользователь заблокирован');
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
    },
    onError: (error: Error) => {
      toast.error(`Ошибка блокировки: ${error.message}`);
    },
  });

  const unblockUserMutation = useMutation({
    mutationFn: (userId: string | number) => unblockUser(userId),
    onSuccess: () => {
      toast.success('Пользователь разблокирован');
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
    },
    onError: (error: Error) => {
      toast.error(`Ошибка разблокировки: ${error.message}`);
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Пользователи</CardTitle>
          <CardDescription>Список всех зарегистрированных пользователей на форуме.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Загрузка пользователей...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Пользователи</CardTitle>
          <CardDescription>Список всех зарегистрированных пользователей на форуме.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Ошибка загрузки пользователей: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Пользователи</CardTitle>
        <CardDescription>Список всех зарегистрированных пользователей на форуме.</CardDescription>
      </CardHeader>
      <CardContent>
        {!users || users.length === 0 ? (
          <p>Пользователи не найдены.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Имя</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Роль</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Дата регистрации</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Действия</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{user.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === 'admin' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                                             : 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {user.is_blocked ? (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title="Разблокировать" 
                          onClick={() => unblockUserMutation.mutate(user.id)} 
                          disabled={unblockUserMutation.isPending}
                        >
                          <Unlock className="h-4 w-4 text-green-600" />
                        </Button>
                      ) : (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title="Заблокировать" 
                          onClick={() => blockUserMutation.mutate(user.id)} 
                          disabled={blockUserMutation.isPending}
                        >
                          <Lock className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 