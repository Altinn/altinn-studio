import React from 'react';
import { Assistant } from '../Assistant/Assistant';
import type { AssistantConfig, AssistantTexts, ChatThread } from '../types/AssistantConfig';

export class AssistantImpl {
  private readonly texts: AssistantTexts;
  private readonly chatThreads: ChatThread[];
  private readonly onSubmitMessage: AssistantConfig['onSubmitMessage'];

  constructor(config: AssistantConfig) {
    this.texts = config.texts;
    this.chatThreads = config.chatThreads;
    this.onSubmitMessage = config.onSubmitMessage;
    this.getAssistant = this.getAssistant.bind(this);
  }

  public getAssistant(): React.ReactElement {
    return (
      <Assistant
        texts={this.texts}
        chatThreads={this.chatThreads}
        onSubmitMessage={this.onSubmitMessage}
      />
    );
  }
}
