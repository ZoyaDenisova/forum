import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose, // Для кнопки закрытия
} from "@/components/ui/dialog"; // Предполагаем, что этот файл будет создан после npx shadcn-ui@latest add dialog
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // Добавим Textarea для описания
import { PlusCircle } from 'lucide-react';

interface AddCategoryFormProps {
  onAddCategory: (name: string, description: string) => Promise<void>; // Функция обратного вызова при успешном добавлении
  isLoading?: boolean; // Для состояния загрузки кнопки Submit
}

export function AddCategoryForm({ onAddCategory, isLoading }: AddCategoryFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Название категории не может быть пустым.');
      return;
    }
    try {
      await onAddCategory(name.trim(), description.trim());
      setName('');
      setDescription('');
      setOpen(false); // Закрываем диалог при успехе
    } catch (err) {
      setError((err as Error).message || 'Произошла ошибка при добавлении категории.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PlusCircle className="h-4 w-4 mr-2" />
          Добавить категорию
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Добавить новую категорию</DialogTitle>
          <DialogDescription>
            Введите название и описание для новой категории форума.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Название
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Описание
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-3"
                rows={3}
              />
            </div>
            {error && (
              <p className="col-span-4 text-sm text-red-500 text-center">{error}</p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Отмена
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Добавление...' : 'Добавить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 