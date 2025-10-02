import React, { useState } from 'react';
import type { ReactElement } from 'react';
import { StudioResizableLayout } from '@studio/components-legacy';
import type { Message, ModeOption, ChatThread } from '../../types';
import { SimpleChatInterface } from '../SimpleChatInterface';
import { ChatHistorySidebar } from '../ChatHistorySidebar';
import { ChatSidePanel } from '../ChatSidePanel';
import classes from './AdvancedChatInterface.module.css';

export type AdvancedChatInterfaceProps = {
  chatThreads: ChatThread[];
  currentThreadId?: string;
  onSelectThread: (threadId: string) => void;
  onSendMessage: (message: Message) => void;
  sendButtonText: string;
  modeOptions?: ModeOption[];
  selectedMode?: string;
  onModeChange?: (mode: string) => void;
  textareaPlaceholder?: string;
  sidePanelLabels: {
    preview: string;
    diff: string;
    fileBrowser: string;
  };
  previewContent?: ReactElement;
  diffContent?: ReactElement;
  fileBrowserContent?: ReactElement;
  leftSidebarCollapsed?: boolean;
  onLeftSidebarToggle?: () => void;
};

export function AdvancedChatInterface({
  chatThreads,
  currentThreadId,
  onSelectThread,
  onSendMessage,
  sendButtonText,
  modeOptions,
  selectedMode,
  onModeChange,
  textareaPlaceholder,
  sidePanelLabels,
  previewContent,
  diffContent,
  fileBrowserContent,
  leftSidebarCollapsed = false,
}: AdvancedChatInterfaceProps): ReactElement {
  const currentThread = chatThreads.find((thread) => thread.id === currentThreadId);
  const messages = currentThread?.messages || [];

  return (
    <div className={classes.container}>
      <StudioResizableLayout.Container orientation='horizontal' localStorageContext='ai-chat'>
        <StudioResizableLayout.Element
          minimumSize={200}
          maximumSize={400}
          collapsed={leftSidebarCollapsed}
          collapsedSize={0}
        >
          <ChatHistorySidebar
            chatThreads={chatThreads}
            selectedThreadId={currentThreadId}
            onSelectThread={onSelectThread}
          />
        </StudioResizableLayout.Element>

        <StudioResizableLayout.Element>
          <SimpleChatInterface
            messages={messages}
            onSendMessage={onSendMessage}
            sendButtonText={sendButtonText}
            modeOptions={modeOptions}
            selectedMode={selectedMode}
            onModeChange={onModeChange}
            textareaPlaceholder={textareaPlaceholder}
          />
        </StudioResizableLayout.Element>

        <StudioResizableLayout.Element minimumSize={250} maximumSize={600}>
          <ChatSidePanel
            tabLabels={sidePanelLabels}
            previewContent={previewContent}
            diffContent={diffContent}
            fileBrowserContent={fileBrowserContent}
          />
        </StudioResizableLayout.Element>
      </StudioResizableLayout.Container>
    </div>
  );
}
