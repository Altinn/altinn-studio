import React from 'react';
import { render, screen } from '@testing-library/react';
import { FeedbackFormImpl } from '../config/FeedbackFormImpl';
import { mockQuestions } from '../../mocks/mockQuestionsConfig';
import { userEvent } from '@testing-library/user-event';

describe('FeedbackFormImpl', () => {
  it('should render FeedbackFormImpl', () => {
    const feedbackForm = new FeedbackFormImpl({
      id: 'test',
      buttonTexts: {
        submit: 'Submit',
        trigger: 'Give feedback',
        close: 'Close',
      },
      heading: 'Give feedback - heading',
      description: 'Description',
      questions: mockQuestions,
      submitPath: 'test',
    });

    render(<div>{feedbackForm.getFeedbackForm()}</div>);

    expect(screen.getByRole('button', { name: 'Give feedback' })).toBeInTheDocument();
  });

  it('should open form modal when trigger button is clicked', async () => {
    const user = userEvent.setup();
    const feedbackForm = new FeedbackFormImpl({
      id: 'test',
      buttonTexts: {
        submit: 'Submit',
        trigger: 'Give feedback',
        close: 'Close',
      },
      heading: 'Give feedback - heading',
      description: 'Description',
      questions: mockQuestions,
      submitPath: 'test',
    });

    render(<div>{feedbackForm.getFeedbackForm()}</div>);

    expect(screen.queryByText('Give feedback - heading')).not.toBeInTheDocument();

    const triggerButton = screen.getByRole('button', { name: 'Give feedback' });
    await user.click(triggerButton);

    expect(screen.getByText('Give feedback - heading')).toBeInTheDocument();
  });
});
