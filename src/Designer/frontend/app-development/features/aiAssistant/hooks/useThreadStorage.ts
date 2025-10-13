import { useState, useEffect, useRef, useCallback } from 'react';
import type { ChatThread } from '@studio/assistant';

const THREADS_STORAGE_KEY = 'ai-assistant-threads';

/**
 * Hook for managing chat threads in localStorage
 */
export const useThreadStorage = () => {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const threadsRef = useRef<ChatThread[]>([]);
  const isLoading = useRef(true);

  // Load threads from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(THREADS_STORAGE_KEY);
      if (stored) {
        const parsedThreads = JSON.parse(stored);
        // Convert timestamp strings back to Date objects
        const threadsWithDates = parsedThreads.map((thread: any) => ({
          ...thread,
          messages: thread.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          })),
          createdAt: new Date(thread.createdAt),
          updatedAt: new Date(thread.updatedAt),
        }));
        setThreads(threadsWithDates);
        threadsRef.current = threadsWithDates;
      }
    } catch (error) {
      console.warn('Failed to load threads from localStorage:', error);
    } finally {
      isLoading.current = false;
    }
  }, []);

  // Keep ref in sync with state
  useEffect(() => {
    threadsRef.current = threads;
  }, [threads]);

  // Save threads to localStorage whenever they change
  useEffect(() => {
    if (!isLoading.current) {
      try {
        localStorage.setItem(THREADS_STORAGE_KEY, JSON.stringify(threads));
      } catch (error) {
        console.warn('Failed to save threads to localStorage:', error);
      }
    }
  }, [threads]);

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
