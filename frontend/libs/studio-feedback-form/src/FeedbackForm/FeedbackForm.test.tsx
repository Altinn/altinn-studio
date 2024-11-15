import React from 'react';
import { render, screen } from '@testing-library/react';
import { FeedbackForm } from './FeedbackForm';
import type { ButtonTexts } from '../types/QuestionsProps';
import { mockQuestions } from '../../mocks/mockQuestionsConfig';
import { FeedbackFormContext } from '../contexts/FeedbackFormContext';
import userEvent from '@testing-library/user-event';

const buttonTexts: ButtonTexts = {
  submit: 'Submit',
  trigger: 'Feedback',
  close: 'Close',
};

const heading = 'Heading';

describe('FeedbackForm', () => {
  it('should render FeedbackForm', () => {
    renderFeedbackForm(mockQuestions);
    expect(screen.getByText(buttonTexts.trigger)).toBeInTheDocument();
  });

  it('should open FeedbackForm modal when trigger is clicked', async () => {
    const user = userEvent.setup();
    renderFeedbackForm(mockQuestions);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const trigger = screen.getByText(buttonTexts.trigger);
    await user.click(trigger);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(heading)).toBeInTheDocument();
  });

  it('should close FeedbackForm modal when submit button is clicked', async () => {
    const user = userEvent.setup();
    renderFeedbackForm(mockQuestions);

    const trigger = screen.getByText(buttonTexts.trigger);
    await user.click(trigger);

    const closeButton = screen.getByText(buttonTexts.submit);
    await user.click(closeButton);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render all questions of type yesNo and text', async () => {
    const user = userEvent.setup();
    renderFeedbackForm(mockQuestions);

    const trigger = screen.getByText(buttonTexts.trigger);
    await user.click(trigger);

    mockQuestions.forEach((question) => {
      // Checkbox question type is not yet implemented in form. Once implemented, this test should be updated.
      if (question.type !== 'checkbox') {
        expect(screen.getByText(question.questionText)).toBeInTheDocument();
      } else {
        expect(screen.queryByText(question.questionText)).not.toBeInTheDocument();
      }
    });
  });

  it('should update answers when a question is answered', async () => {
    const mockSetAnswers = jest.fn();
    const user = userEvent.setup();
    renderFeedbackForm(mockQuestions, mockSetAnswers);

    const trigger = screen.getByText(buttonTexts.trigger);
    await user.click(trigger);

    const yesButton = screen.getByRole('button', { name: 'Yes' });
    await user.click(yesButton);

    expect(mockSetAnswers).toHaveBeenCalledTimes(1);
    expect(mockSetAnswers).toHaveBeenCalledWith({ better: 'yes' });
  });
});

const renderFeedbackForm = (
  questions: any,
  setAnswers?: (answers: Record<string, string>) => void,
) => {
  render(
    <FeedbackFormContext.Provider value={{ answers: {}, setAnswers: setAnswers || jest.fn() }}>
      <FeedbackForm
        buttonTexts={buttonTexts}
        heading={heading}
        questions={questions}
        position='inline'
        onSubmit={jest.fn()}
      />
    </FeedbackFormContext.Provider>,
  );
};
