import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchMessagesByTopicId, sendTopicMessage, connectToTopicWebSocket, editTopicMessage, deleteTopicMessage } from '@/app/api/forum';
import type { TopicMessage, ChatMessage } from '@/types/forum';
import { useAuth } from '@/app/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SendHorizonal, MessageSquarePlus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from '@tanstack/react-router';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// --- ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ ДАТЫ ИЗ WEBSOCKET ---
function normalizeIsoDateString(iso: string): string {
  if (typeof iso !== 'string') return '';
  return iso.replace(/(\.\d{3})\d*(Z)/, '$1$2');
}

export function GeneralChatPanel() {
  const { user, isAuthenticated } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  // --- Состояния для редактирования сообщения ---
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  // Получение сообщений через API топика id=0
  const { data: initialMessages, isLoading, isError, error } = useQuery<TopicMessage[], Error>({
    queryKey: ['generalChatMessages'],
    queryFn: () => fetchMessagesByTopicId('0'),
    staleTime: Infinity,
  });

  useEffect(() => {
    if (initialMessages) {
      // Преобразуем TopicMessage[] в ChatMessage[] для совместимости
      setMessages(
        initialMessages.map((msg) => ({
          id: msg.id,
          text: msg.content,
          author: { id: msg.author, name: msg.authorName },
          createdAt: msg.createdAt,
        }))
      );
    }
  }, [initialMessages]);

  // Подписка на новые сообщения через WebSocket
  useEffect(() => {
    const disconnect = connectToTopicWebSocket('0', {
      onMessage: (wsData: any) => {
        // wsData: { action: 'created'|'updated'|'deleted', message, message_id }
        console.log('wsData', wsData);
        if ((wsData.action === 'created' || wsData.action === 'updated') && wsData.message) {
          const msg: ChatMessage = {
            id: String(wsData.message.ID ?? wsData.message.id),
            text: wsData.message.Content ?? wsData.message.content ?? wsData.message.text,
            author: {
              id: String(wsData.message.author),
              name: wsData.message.authorName ?? wsData.message.author_name ?? (wsData.message.author && wsData.message.author.name) ?? '',
            },
            createdAt: normalizeIsoDateString(wsData.message.CreatedAt ?? wsData.message.created_at ?? wsData.message.createdAt),
          };
          console.log('msg', msg);
          setMessages((prev) => {
            if (wsData.action === 'created') {
              if (prev.find((m) => m.id === msg.id)) return prev;
              return [...prev, msg].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            } else if (wsData.action === 'updated') {
              return prev.map(m => m.id === msg.id ? msg : m);
            }
            return prev;
          });
          // Скролл/уведомление о новых
          if (scrollAreaRef.current) {
            const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement | null;
            if (viewport) {
              const { scrollTop, scrollHeight, clientHeight } = viewport;
              if (scrollHeight - scrollTop - clientHeight > 30 && msg.author.id !== user?.id) {
                setHasNewMessages(true);
              } else {
                scrollToBottom('smooth');
              }
            }
          } else {
            scrollToBottom('smooth');
          }
        } else if (wsData.action === 'deleted' && wsData.message_id) {
          setMessages((prev) => prev.filter(m => m.id !== String(wsData.message_id)));
        }
      },
    });
    return () => disconnect();
  }, [user]);

  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    setTimeout(() => {
      if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement | null;
        if (viewport) {
          viewport.scrollTo({ top: viewport.scrollHeight, behavior });
          setHasNewMessages(false);
        }
      }
    }, 50);
  };

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (user && (String(lastMessage.author.id) === String(user.id) || Date.now() - new Date(lastMessage.createdAt).getTime() < 1000)) {
        if (scrollAreaRef.current) {
          const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement | null;
          if (viewport) {
            const { scrollTop, scrollHeight, clientHeight } = viewport;
            if (scrollHeight - scrollTop - clientHeight < 250 || String(lastMessage.author.id) === String(user.id)) {
              scrollToBottom('auto');
            }
          }
        }
      }
    }
  }, [messages, user]);

  // --- Мутация для редактирования сообщения ---
  const editMessageMutation = useMutation({
    mutationFn: (payload: { messageId: string; newContent: string }) =>
      editTopicMessage({ topicId: '0', messageId: payload.messageId, newContent: payload.newContent }),
    onSuccess: (_, variables) => {
      toast.success('Сообщение успешно обновлено');
      setMessages((prev) => prev.map(msg =>
        msg.id === variables.messageId ? { ...msg, content: variables.newContent } : msg
      ));
      setEditingMessageId(null);
      setEditingContent('');
    },
    onError: (error) => {
      toast.error('Ошибка редактирования: ' + (error as Error).message);
    },
  });

  // --- Мутация для удаления сообщения ---
  const deleteMessageMutation = useMutation({
    mutationFn: (messageId: string) => deleteTopicMessage('0', messageId),
    onSuccess: (_, messageId) => {
      toast.success('Сообщение успешно удалено');
      setMessages((prev) => prev.filter(msg => msg.id !== messageId));
    },
    onError: (error) => {
      toast.error('Ошибка удаления: ' + (error as Error).message);
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => sendTopicMessage('0', { author: user?.name || 'Аноним', content }),
    onSuccess: () => {
      setNewMessage('');
      inputRef.current?.focus();
    },
    onError: (err) => {
      toast.error(`Ошибка отправки сообщения: ${(err as Error).message}`);
      inputRef.current?.focus();
    },
  });

  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !isAuthenticated) return;
    sendMessageMutation.mutate(newMessage.trim());
  };

  const handleStartEdit = (msg: ChatMessage) => {
    setEditingMessageId(msg.id);
    setEditingContent(msg.text);
  };
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };
  const handleSaveEdit = () => {
    if (!editingMessageId || !editingContent.trim()) return;
    editMessageMutation.mutate({ messageId: editingMessageId, newContent: editingContent.trim() });
  };
  const handleDeleteMessage = (messageId: string) => {
    deleteMessageMutation.mutate(messageId);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    if (target.scrollHeight - target.scrollTop - target.clientHeight < 1) {
      setHasNewMessages(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-card border-l">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Общий чат</h2>
      </div>
      <ScrollArea className="flex-grow h-0" ref={scrollAreaRef} onScroll={handleScroll}>
        <div className="p-4">
          {isLoading && <p className="text-center">Загрузка сообщений...</p>}
          {isError && <p className="text-center text-destructive">Ошибка: {error?.message}</p>}
          {!isLoading && !isError && messages.length === 0 && (
            <p className="text-center text-muted-foreground">Сообщений пока нет. Начните общение!</p>
          )}
          {messages.map((msg, index) => {
            const isAuthor = user && String(msg.author.id) === String(user.id);
            const canDelete = user && (user.role === 'admin' || String(msg.author.id) === String(user.id));
            return (
              <div
                key={msg.id || `chat-msg-${index}`}
                className={`mb-3 p-3 rounded-lg shadow-sm flex flex-col max-w-[85%] break-words group relative ${
                  !!user?.id && String(msg.author.id) === String(user.id)
                    ? 'bg-primary/10 dark:bg-primary/20 ml-auto items-end'
                    : 'bg-muted/50 dark:bg-muted/20 mr-auto items-start'
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <p className={`text-sm font-semibold mb-1 ${
                    !!user?.id && String(msg.author.id) === String(user.id) ? 'text-primary' : 'text-foreground/80'
                  }`}>
                    {msg.author.name || `Пользователь #${msg.author.id}`}
                  </p>
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    {isAuthor && editingMessageId !== msg.id && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 p-0.5" onClick={() => handleStartEdit(msg)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && editingMessageId !== msg.id && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 p-0.5 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Это действие необратимо. Сообщение будет удалено навсегда.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteMessage(msg.id)}>
                              Удалить
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
                {editingMessageId === msg.id ? (
                  <div className='w-full mt-1'>
                    <Textarea
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      rows={3}
                      className='w-full text-sm'
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <Button variant="ghost" size="sm" onClick={handleCancelEdit}>Отмена</Button>
                      <Button size="sm" onClick={handleSaveEdit} disabled={editMessageMutation.isPending || !editingContent.trim()}>
                        {editMessageMutation.isPending ? 'Сохранение...' : 'Сохранить'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-foreground leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    <p className="text-xs text-muted-foreground mt-1.5 self-end">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
      {hasNewMessages && (
        <div className="absolute bottom-[85px] right-4 z-20 md:bottom-[80px]">
          <Button
            onClick={() => scrollToBottom('smooth')}
            variant="secondary"
            className="shadow-lg animate-bounce relative pr-3"
          >
            Новые сообщения ↓
          </Button>
        </div>
      )}
      {isAuthenticated ? (
        <form onSubmit={handleSendMessage} className="p-3 border-t flex items-center gap-2 bg-background">
          <Input
            ref={inputRef}
            type="text"
            placeholder={"Написать сообщение..."}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-grow"
            autoFocus
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim() || sendMessageMutation.isPending}>
            <SendHorizonal className="h-5 w-5" />
          </Button>
        </form>
      ) : (
        <div className="p-3 text-sm text-center text-muted-foreground border-t bg-background">
          <Link to="/login" className="underline">Войдите</Link> или <Link to="/register" className="underline">зарегистрируйтесь</Link>, чтобы отправлять сообщения.
        </div>
      )}
    </div>
  );
}
