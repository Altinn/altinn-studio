import React, { useState } from 'react';
import type { ReactElement } from 'react';
import { StudioResizableLayout } from '@studio/components-legacy';
import { ToolColumn } from '../ToolColumn';
import classes from './InterfaceAdvanced.module.css';
import { AssistantHeadingBar } from '../AssistantHeading/AssistantHeading';
import type { AssistantConfig, ChatThread, ConnectionStatus } from '../../types/AssistantConfig';
import { ThreadColumn } from '../ThreadColumn';
import { ThreadColumnCollapsed } from '../ThreadColumnHidden';
import { ChatColumn } from '../ChatColumn/ChatColumn';
import { ViewType } from '../../types/ViewType';
import type { UserInputFlags } from '../ChatColumn/UserInput/UserInput';

export type InterfaceAdvancedProps = AssistantConfig & {
  activeThreadId?: string;
  connectionStatus?: ConnectionStatus;
};

export function InterfaceAdvanced({
  texts,
  chatThreads,
  onSubmitMessage,
  activeThreadId,
  connectionStatus,
}: InterfaceAdvancedProps): ReactElement {
  const [isThreadColumnCollapsed, setIsThreadColumnCollapsed] = useState(false);
  const [selectedToolView, setSelectedView] = useState<ViewType>(ViewType.Preview);

  // Get the current thread - prefer activeThreadId, then most recently updated thread
  const currentThread = React.useMemo(() => {
    // First try to find the explicitly requested thread
    if (activeThreadId) {
      const thread = chatThreads.find((t) => t.id === activeThreadId);
      if (thread) {
        return thread;
      }
    }

    // Otherwise, return the most recently updated thread
    if (chatThreads.length > 0) {
      const mostRecent = chatThreads.reduce((latest, current) =>
        !latest.updatedAt || (current.updatedAt && current.updatedAt > latest.updatedAt)
          ? current
          : latest,
      );
      return mostRecent;
    }

    return emptyChatThread;
  }, [activeThreadId, chatThreads]);

  const handleToggle = () => setIsThreadColumnCollapsed(!isThreadColumnCollapsed);

  const advancedModeFlags: UserInputFlags = {
    attachmentButton: true,
    agentModeSwitch: true,
  };

  return (
    <div className={classes.container}>
      <AssistantHeadingBar
        texts={texts}
        selectedView={selectedToolView}
        onViewChange={setSelectedView}
        connectionStatus={connectionStatus}
      />
      <div className={classes.resizableWrapper}>
        <StudioResizableLayout.Container orientation='horizontal' localStorageContext='ai-chat'>
          {isThreadColumnCollapsed ? (
            <ThreadColumnCollapsed onToggle={handleToggle} />
          ) : (
            <StudioResizableLayout.Element minimumSize={200} maximumSize={350}>
              <ThreadColumn
                texts={texts}
                chatThreads={chatThreads}
                selectedThreadId={currentThread.id}
                onSelectThread={() => {}}
                onToggleCollapse={handleToggle}
              />
            </StudioResizableLayout.Element>
          )}
          <StudioResizableLayout.Element minimumSize={400}>
            {(() => {
              return (
                <ChatColumn
                  texts={texts}
                  messages={currentThread?.messages ?? []}
                  onSubmitMessage={onSubmitMessage}
                  flags={advancedModeFlags}
                />
              );
            })()}
          </StudioResizableLayout.Element>
          <StudioResizableLayout.Element minimumSize={200}>
            <ToolColumn selectedView={selectedToolView} />
          </StudioResizableLayout.Element>
        </StudioResizableLayout.Container>
      </div>
    </div>
  );
}

const emptyChatThread: ChatThread = {
  id: 'New chat',
  title: 'New chat',
  messages: [],
};
