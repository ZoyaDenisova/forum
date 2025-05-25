import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAllUsers, deleteUser as deleteUserApi, updateUser as updateUserApi } from '@/app/api/users';
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
import { Edit3, Trash2 } from 'lucide-react';
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

  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<User | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<UserEditFormData>({
    resolver: zodResolver(userEditSchema),
    defaultValues: { name: '', email: '', role: '' },
  });

  useEffect(() => {
    if (selectedUserForEdit) {
      setValue('name', selectedUserForEdit.name);
      setValue('email', selectedUserForEdit.email);
      setValue('role', selectedUserForEdit.role);
    } else {
      reset({ name: '', email: '', role: '' });
    }
  }, [selectedUserForEdit, setValue, reset]);

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string | number) => {
      console.log("AdminUsersPage: deleteUserMutation mutationFn called with userId:", userId);
      return deleteUserApi(userId);
    },
    onSuccess: () => {
      console.log("AdminUsersPage: deleteUserMutation onSuccess");
      toast.success("Пользователь успешно удален");
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
    },
    onError: (error: Error) => {
      console.log("AdminUsersPage: deleteUserMutation onError", error);
      toast.error(`Ошибка удаления пользователя: ${error.message}`);
    },
  });

  const handleDeleteUser = (userId: string | number) => {
    console.log("AdminUsersPage: handleDeleteUser called with userId:", userId);
    deleteUserMutation.mutate(userId);
  };

  const updateUserMutation = useMutation({
    mutationFn: (data: { userId: string | number; userData: UserEditFormData }) =>
      updateUserApi(data.userId, data.userData),
    onSuccess: (updatedUser) => {
      toast.success(`Данные пользователя ${updatedUser.name} успешно обновлены.`);
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      setIsEditUserDialogOpen(false);
      setSelectedUserForEdit(null); 
    },
    onError: (error: Error) => {
      toast.error(`Ошибка обновления пользователя: ${error.message}`);
    },
  });

  const handleOpenEditUserDialog = (user: User) => {
    setSelectedUserForEdit(user);
    setIsEditUserDialogOpen(true);
  };

  const onEditUserSubmit = (data: UserEditFormData) => {
    if (selectedUserForEdit) {
      console.log("AdminUsersPage: onEditUserSubmit called with data:", data, "for userId:", selectedUserForEdit.id);
      updateUserMutation.mutate({ userId: selectedUserForEdit.id, userData: data });
    }
  };
  
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <Button variant="ghost" size="icon" title="Редактировать пользователя" onClick={() => handleOpenEditUserDialog(user)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" title="Удалить">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Это действие необратимо. Пользователь {user.name} будет удален.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteUser(user.id)}>
                              Удалить
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={isEditUserDialogOpen} onOpenChange={(isOpen) => {
        setIsEditUserDialogOpen(isOpen);
        if (!isOpen) setSelectedUserForEdit(null);
      }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Редактировать пользователя: {selectedUserForEdit?.name}</DialogTitle>
            <DialogDescription>
              Измените данные пользователя и нажмите "Сохранить".
            </DialogDescription>
          </DialogHeader>
          {selectedUserForEdit && (
            <form onSubmit={handleSubmit(onEditUserSubmit)} className="space-y-4 py-2">
              <div>
                <Label htmlFor="name-edit">Имя</Label>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => <Input id="name-edit" {...field} />}
                />
                {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <Label htmlFor="email-edit">Email</Label>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => <Input id="email-edit" type="email" {...field} />}
                />
                {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <Label htmlFor="role-edit">Роль</Label>
                <Controller
                  name="role"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger id="role-edit">
                        <SelectValue placeholder="Выберите роль" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.role && <p className="text-sm text-red-500 mt-1">{errors.role.message}</p>}
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Отмена</Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting || updateUserMutation.isPending}>
                  {isSubmitting || updateUserMutation.isPending ? "Сохранение..." : "Сохранить изменения"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
} 