import React from 'react';
import type { QuestionConfig } from '../types/QuestionsProps';
import { FeedbackFormContextProvider } from '../contexts/FeedbackFormContext';
import { FeedbackForm } from '../FeedbackForm/FeedbackForm';

export class FeedbackFormImpl {
  private readonly triggerButtonText: string;
  private readonly closeButtonText: string;
  private readonly heading: string;
  private readonly questions: QuestionConfig[];
  private readonly position: 'inline' | 'fixed' = 'inline';
  private readonly onSubmit: (answers: Record<string, any>) => void;

  constructor(config: {
    triggerButtonText: string;
    closeButtonText: string;
    heading: string;
    questions: QuestionConfig[];
    position?: 'inline' | 'fixed';
    onSubmit: (answers: Record<string, any>) => void;
  }) {
    this.triggerButtonText = config.triggerButtonText;
    this.closeButtonText = config.closeButtonText;
    this.heading = config.heading;
    this.questions = config.questions;
    this.getFeedbackForm = this.getFeedbackForm.bind(this);
    this.position = config.position || 'inline';
    this.onSubmit = config.onSubmit;
  }

  public getFeedbackForm(): React.ReactNode {
    return (
      <FeedbackFormContextProvider>
        <FeedbackForm
          triggerButtonText={this.triggerButtonText}
          closeButtonText={this.closeButtonText}
          heading={this.heading}
          questions={this.questions}
          position={this.position}
          onSubmit={this.onSubmit}
        />
      </FeedbackFormContextProvider>
    );
  }
}
