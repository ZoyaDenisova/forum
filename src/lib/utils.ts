import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getErrorMessage(error: unknown, defaultMessage: string = 'Произошла неизвестная ошибка'): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  // Попытка извлечь message, если это объект с таким полем (например, от API)
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  // Для случаев, когда error может быть объектом без message, но его строковое представление информативно
  // (хотя это редкость и обычно приводит к [object Object])
  // if (error && typeof error === 'object' && error.toString() !== '[object Object]') {
  //   return error.toString();
  // }
  return defaultMessage;
}
