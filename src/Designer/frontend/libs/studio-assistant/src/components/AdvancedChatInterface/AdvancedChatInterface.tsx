import React, { useState } from 'react';
import type { ReactElement } from 'react';
import { StudioResizableLayout } from '@studio/components-legacy';
import { ToolColumn } from '../ToolColumn';
import classes from './AdvancedChatInterface.module.css';
import { AssistantHeadingBar } from '../AssistantHeading/AssistantHeading';
import type { AssistantConfig, ChatThread } from '../../types/AssistantConfig';
import { ThreadColumn } from '../ThreadColumn';
import { ThreadColumnHidden } from '../ThreadColumnHidden';
import { ChatColumn } from '../ChatColumn/ChatColumn';
import { ViewType } from '../../types/ViewType';

export type AdvancedChatInterfaceProps = AssistantConfig;

export function AdvancedChatInterface({
  texts,
  chatThreads,
  onSubmitMessage,
}: AdvancedChatInterfaceProps): ReactElement {
  const [isThreadColumnCollapsed, setIsThreadColumnCollapsed] = useState(false);
  const [selectedToolView, setSelectedView] = useState<ViewType>(ViewType.Preview);
  const [currentThread, setCurrentThread] = useState<ChatThread>(chatThreads[0] ?? emptyChatThread);

  const handleToggle = () => setIsThreadColumnCollapsed(!isThreadColumnCollapsed);

  const handleChangeThread = (threadId: string) => {
    const thread = chatThreads.find((t) => t.id === threadId);
    setCurrentThread(thread);
  };

  return (
    <div className={classes.container}>
      <AssistantHeadingBar
        texts={texts}
        selectedView={selectedToolView}
        onViewChange={setSelectedView}
      />
      <div className={classes.resizableWrapper}>
        <StudioResizableLayout.Container orientation='horizontal' localStorageContext='ai-chat'>
          {isThreadColumnCollapsed ? (
            <ThreadColumnHidden onToggle={handleToggle} />
          ) : (
            <StudioResizableLayout.Element
              minimumSize={200}
              maximumSize={350}
              collapsed={isThreadColumnCollapsed}
              collapsedSize={60}
            >
              <ThreadColumn
                texts={texts}
                chatThreads={chatThreads}
                selectedThreadId={currentThread.id}
                onSelectThread={handleChangeThread}
                isCollapsed={isThreadColumnCollapsed}
                onToggleCollapse={handleToggle}
              />
            </StudioResizableLayout.Element>
          )}
          <StudioResizableLayout.Element minimumSize={400}>
            <ChatColumn
              texts={texts}
              messages={currentThread?.messages ?? []}
              onSubmitMessage={onSubmitMessage}
            />
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
