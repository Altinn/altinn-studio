import React from 'react';
import type { ButtonTexts, QuestionConfig } from '../types/QuestionsProps';
import { FeedbackFormContextProvider } from '../contexts/FeedbackFormContext';
import { FeedbackForm } from '../FeedbackForm/FeedbackForm';
import type { FeedbackFormConfig } from '../types/FeedbackFormConfig';

export class FeedbackFormImpl {
  private readonly id: string;
  private readonly buttonTexts: ButtonTexts;
  private readonly heading: string;
  private readonly description: string;
  private readonly disclaimer?: string;
  private readonly questions: QuestionConfig[];
  private readonly position: 'inline' | 'fixed' = 'inline';
  private readonly submitPath: string;

  constructor(config: FeedbackFormConfig) {
    this.id = config.id;
    this.buttonTexts = config.buttonTexts;
    this.heading = config.heading;
    this.description = config.description;
    this.disclaimer = config.disclaimer;
    this.questions = config.questions;
    this.getFeedbackForm = this.getFeedbackForm.bind(this);
    this.position = config.position || 'inline';
    this.submitPath = config.submitPath;
  }

  public getFeedbackForm(): React.ReactElement {
    return (
      <FeedbackFormContextProvider submitPath={this.submitPath}>
        <FeedbackForm
          id={this.id}
          buttonTexts={this.buttonTexts}
          heading={this.heading}
          description={this.description}
          disclaimer={this.disclaimer}
          questions={this.questions}
          position={this.position}
        />
      </FeedbackFormContextProvider>
    );
  }
}
