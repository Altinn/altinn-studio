import React from 'react';
import { Assistant } from '../Assistant/Assistant';
import type { AssistantConfig, Thread, ButtonTexts } from '../types/AssistantConfig';

export class AssistantImpl {
  private readonly heading: string;
  private readonly threads: Thread[];
  private readonly buttonTexts: ButtonTexts;
  private readonly onSubmitMessage: AssistantConfig['onSubmitMessage'];

  constructor(config: AssistantConfig) {
    this.threads = config.threads;
    this.buttonTexts = config.buttonTexts;
    this.heading = config.heading;
    this.onSubmitMessage = config.onSubmitMessage;
    this.getAssistant = this.getAssistant.bind(this);
  }

  public getAssistant(): React.ReactElement {
    return (
      <Assistant
        heading={this.heading}
        threads={this.threads}
        buttonTexts={this.buttonTexts}
        onSubmitMessage={this.onSubmitMessage}
      />
    );
  }
}
