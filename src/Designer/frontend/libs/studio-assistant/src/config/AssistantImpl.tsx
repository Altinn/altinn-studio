import React from 'react';
import { Assistant } from '../Assistant/Assistant';
import type { AssistantConfig, ButtonTexts } from '../types/AssistantConfig';

export class AssistantImpl {
  private readonly heading: string;
  private readonly buttonTexts: ButtonTexts;
  private readonly onSubmitMessage: AssistantConfig['onSubmitMessage'];

  constructor(config: AssistantConfig) {
    this.buttonTexts = config.buttonTexts;
    this.heading = config.heading;
    this.onSubmitMessage = config.onSubmitMessage;
    this.getAssistant = this.getAssistant.bind(this);
  }

  public getAssistant(): React.ReactElement {
    return (
      <Assistant
        heading={this.heading}
        buttonTexts={this.buttonTexts}
        onSubmitMessage={this.onSubmitMessage}
      />
    );
  }
}
