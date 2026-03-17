import { useState, useEffect, useRef, useCallback } from 'react';
import type { ChatThread } from '@studio/assistant';
import { useOrgAppScopedStorage } from '@studio/hooks';

const THREADS_STORAGE_KEY = 'ai-assistant-threads';

/**
 * Hook for managing chat threads in org/app scoped localStorage
 */
export const useThreadStorage = () => {
  const storage = useOrgAppScopedStorage({ storage: 'localStorage' });
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const threadsRef = useRef<ChatThread[]>([]);
  const isLoading = useRef(true);

  // Load threads from localStorage on mount
  useEffect(() => {
    try {
      const stored = storage.getItem<ChatThread[]>(THREADS_STORAGE_KEY);
      if (stored && Array.isArray(stored)) {
        // Convert timestamp strings back to Date objects
        const threadsWithDates: ChatThread[] = stored.map((thread) => ({
          ...thread,
          messages: thread.messages.map((msg) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          })),
          createdAt: thread.createdAt,
          updatedAt: thread.updatedAt,
        }));
        setThreads(threadsWithDates);
        threadsRef.current = threadsWithDates;
      }
    } catch (error) {
      console.warn('Failed to load threads from localStorage:', error);
    } finally {
      isLoading.current = false;
    }
  }, [storage]);

  // Keep ref in sync with state
  useEffect(() => {
    threadsRef.current = threads;
  }, [threads]);

  // Save threads to localStorage whenever they change
  useEffect(() => {
    if (!isLoading.current) {
      try {
        storage.setItem(THREADS_STORAGE_KEY, threads);
      } catch (error) {
        console.warn('Failed to save threads to localStorage:', error);
      }
    }
  }, [threads, storage]);

  const addThread = useCallback((thread: ChatThread) => {
    setThreads((prev) => {
      // Check if thread already exists to prevent duplicates
      const exists = prev.some((t) => t.id === thread.id);
      if (exists) {
        console.warn('Thread already exists:', thread.id);
        return prev;
      }
      const newThreads = [thread, ...prev];
      threadsRef.current = newThreads;
      return newThreads;
    });
  }, []);

  const updateThread = useCallback((threadId: string, updates: Partial<ChatThread>) => {
    setThreads((prev) => {
      const newThreads = prev.map((thread) =>
        thread.id === threadId
          ? { ...thread, ...updates, updatedAt: new Date().toISOString() }
          : thread,
      );
      threadsRef.current = newThreads;
      return newThreads;
    });
  }, []);

  const deleteThread = useCallback((threadId: string) => {
    setThreads((prev) => {
      const newThreads = prev.filter((thread) => thread.id !== threadId);
      threadsRef.current = newThreads;
      return newThreads;
    });
  }, []);

  const getThread = useCallback((threadId: string) => {
    return threadsRef.current.find((thread) => thread.id === threadId);
  }, []);

  return {
    threads,
    isLoading: isLoading.current,
    addThread,
    updateThread,
    deleteThread,
    getThread,
  };
};
