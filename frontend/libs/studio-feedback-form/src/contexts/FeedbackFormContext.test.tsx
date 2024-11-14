import React from 'react';
import { FeedbackFormContextProvider, useFeedbackFormContext } from './FeedbackFormContext';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('FeedbackFormContext', () => {
  it('should provide a context with an empty answers object', () => {
    const TestComponent = () => {
      const { answers } = useFeedbackFormContext();
      return <div>{JSON.stringify(answers)}</div>;
    };

    render(
      <FeedbackFormContextProvider>
        <TestComponent />
      </FeedbackFormContextProvider>,
    );

    expect(screen.getByText('{}')).toBeInTheDocument();
  });

  it('should update the answers object when setAnswers is called', async () => {
    const TestComponent = () => {
      const { answers, setAnswers } = useFeedbackFormContext();
      return (
        <div>
          <span>{JSON.stringify(answers)}</span>
          <button onClick={() => setAnswers({ test: 'test' })}>Update Answers</button>
        </div>
      );
    };

    render(
      <FeedbackFormContextProvider>
        <TestComponent />
      </FeedbackFormContextProvider>,
    );
    const user = userEvent.setup();
    const button = screen.getByRole('button', { name: 'Update Answers' });
    await user.click(button);

    expect(screen.getByText('{"test":"test"}')).toBeInTheDocument();
  });
});
