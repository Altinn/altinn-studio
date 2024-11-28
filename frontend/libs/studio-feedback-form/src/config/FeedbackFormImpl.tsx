import React from 'react';
import type { ButtonTexts, QuestionConfig } from '../types/QuestionsProps';
import { FeedbackFormContextProvider } from '../contexts/FeedbackFormContext';
import { FeedbackForm } from '../FeedbackForm/FeedbackForm';
import type { AnswerType } from '../types/AnswerType';

export class FeedbackFormImpl {
  private readonly id: string;
  private readonly buttonTexts: ButtonTexts;
  private readonly heading: string;
  private readonly description: string;
  private readonly questions: QuestionConfig[];
  private readonly position: 'inline' | 'fixed' = 'inline';
  private readonly onSubmit: (answers: Record<string, any>) => void;

  constructor(config: {
    id: string;
    buttonTexts: ButtonTexts;
    heading: string;
    description: string;
    questions: QuestionConfig[];
    position?: 'inline' | 'fixed';
    onSubmit: (answers: Record<string, AnswerType>) => void;
  }) {
    this.id = config.id;
    this.buttonTexts = config.buttonTexts;
    this.heading = config.heading;
    this.description = config.description;
    this.questions = config.questions;
    this.getFeedbackForm = this.getFeedbackForm.bind(this);
    this.position = config.position || 'inline';
    this.onSubmit = config.onSubmit;
  }

  public getFeedbackForm(): React.ReactElement {
    return (
      <FeedbackFormContextProvider>
        <FeedbackForm
          id={this.id}
          buttonTexts={this.buttonTexts}
          heading={this.heading}
          description={this.description}
          questions={this.questions}
          position={this.position}
          onSubmit={this.onSubmit}
        />
      </FeedbackFormContextProvider>
    );
  }
}
