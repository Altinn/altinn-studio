import React from 'react';
import type { ButtonTexts, QuestionConfig } from '../types/QuestionsProps';
import { FeedbackFormContextProvider } from '../contexts/FeedbackFormContext';
import { FeedbackForm } from '../FeedbackForm/FeedbackForm';

export class FeedbackFormImpl {
  private readonly buttonTexts: ButtonTexts;
  private readonly heading: string;
  private readonly questions: QuestionConfig[];
  private readonly position: 'inline' | 'fixed' = 'inline';
  private readonly onSubmit: (answers: Record<string, any>) => void;

  constructor(config: {
    buttonTexts: ButtonTexts;
    heading: string;
    questions: QuestionConfig[];
    position?: 'inline' | 'fixed';
    onSubmit: (answers: Record<string, any>) => void;
  }) {
    this.buttonTexts = config.buttonTexts;
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
          buttonTexts={this.buttonTexts}
          heading={this.heading}
          questions={this.questions}
          position={this.position}
          onSubmit={this.onSubmit}
        />
      </FeedbackFormContextProvider>
    );
  }
}
