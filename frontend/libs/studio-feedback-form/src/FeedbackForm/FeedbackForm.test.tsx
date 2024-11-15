import React from 'react';
import { render, screen } from '@testing-library/react';
import { FeedbackForm } from './FeedbackForm';
import type { ButtonTexts } from '../types/QuestionsProps';
import { mockQuestions } from '../../mocks/mockQuestionsConfig';
import { FeedbackFormContextProvider } from '../contexts/FeedbackFormContext';
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
});

const renderFeedbackForm = (questions: any) => {
  render(
    <FeedbackFormContextProvider>
      <FeedbackForm
        buttonTexts={buttonTexts}
        heading={heading}
        questions={questions}
        position='inline'
        onSubmit={jest.fn()}
      />
    </FeedbackFormContextProvider>,
  );
};
