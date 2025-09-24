import React from 'react';
import { render, screen } from '@testing-library/react';
import { FeedbackForm } from './FeedbackForm';
import type { ButtonTexts } from '../types/QuestionsProps';
import { mockQuestions } from '../../mocks/mockQuestionsConfig';
import { FeedbackFormContext } from '../contexts/FeedbackFormContext';
import userEvent from '@testing-library/user-event';
import axios from 'axios';

const buttonTexts: ButtonTexts = {
  submit: 'Submit',
  trigger: 'Feedback',
  close: 'Close',
};

const heading = 'Heading';
const description = 'Description';

jest.mock('axios');
var mockedAxios = axios as jest.Mocked<typeof axios>;

describe('FeedbackForm', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('should render FeedbackForm', () => {
    renderFeedbackForm({ questions: mockQuestions });
    expect(screen.getByRole('button', { name: buttonTexts.trigger })).toBeInTheDocument();
  });

  it('should open FeedbackForm modal when trigger is clicked when position is inline (default)', async () => {
    const user = userEvent.setup();
    renderFeedbackForm({ questions: mockQuestions });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const trigger = screen.getByRole('button', { name: buttonTexts.trigger });
    await user.click(trigger);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(heading)).toBeInTheDocument();
  });

  it('should open FeedbackForm modal when trigger is clicked when position is "fixed"', async () => {
    const user = userEvent.setup();
    renderFeedbackForm({ questions: mockQuestions, position: 'fixed' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const trigger = screen.getByRole('button', { name: buttonTexts.trigger });
    await user.click(trigger);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(heading)).toBeInTheDocument();
  });

  it('should close FeedbackForm modal when submit button is clicked', async () => {
    const user = userEvent.setup();
    renderFeedbackForm({ questions: mockQuestions });
    mockedAxios.post.mockResolvedValueOnce({});

    const trigger = screen.getByRole('button', { name: buttonTexts.trigger });
    await user.click(trigger);

    const closeButton = screen.getByText(buttonTexts.submit);
    await user.click(closeButton);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should close FeedbackForm modal when submit button is clicked and submission fails', async () => {
    const user = userEvent.setup();
    renderFeedbackForm({ questions: mockQuestions });
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    const trigger = screen.getByRole('button', { name: buttonTexts.trigger });
    await user.click(trigger);

    const submitButton = screen.getByText(buttonTexts.submit);
    mockedAxios.post.mockRejectedValueOnce('Error while submitting feedback');

    await user.click(submitButton);

    // Check if the error was logged
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('Failed to submit feedback'),
      expect.stringContaining('Error while submitting feedback'),
    );

    // Check if the modal is still open
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Clean up
    consoleError.mockRestore();
  });

  it('should render all questions of type yesNo and text', async () => {
    const user = userEvent.setup();
    renderFeedbackForm({ questions: mockQuestions });

    const trigger = screen.getByRole('button', { name: buttonTexts.trigger });
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
    renderFeedbackForm({ questions: mockQuestions, setAnswers: mockSetAnswers });

    const trigger = screen.getByRole('button', { name: buttonTexts.trigger });
    await user.click(trigger);

    const yesButton = screen.getByRole('button', { name: 'Yes' });
    await user.click(yesButton);

    expect(mockSetAnswers).toHaveBeenCalledTimes(1);
    expect(mockSetAnswers).toHaveBeenCalledWith({ better: 'yes' });
  });
});

const renderFeedbackForm = ({
  questions,
  setAnswers,
  position,
}: {
  questions: any;
  setAnswers?: (answers: Record<string, string>) => void;
  position?: 'fixed' | 'inline';
}) => {
  render(
    <FeedbackFormContext.Provider
      value={{ answers: {}, setAnswers: setAnswers || jest.fn(), submitPath: '/test' }}
    >
      <FeedbackForm
        id='test'
        buttonTexts={buttonTexts}
        heading={heading}
        description={description}
        questions={questions}
        position={position || 'inline'}
      />
    </FeedbackFormContext.Provider>,
  );
};
