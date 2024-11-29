import React from 'react';
import { getByText, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedbackForm } from './FeedbackForm';

describe('FeedbackForm', () => {
  it('should render feedback form', () => {
    renderFeedbackForm();
    expect(screen.getByRole('button', { name: 'Gi tilbakemelding' })).toBeInTheDocument();
  });

  it('should open the feedback form when clicking trigger', async () => {
    const user = userEvent.setup();
    renderFeedbackForm();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Gi tilbakemelding' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('should close the feedback form when clicking send', async () => {
    const user = userEvent.setup();
    renderFeedbackForm();
    await user.click(screen.getByRole('button', { name: 'Gi tilbakemelding' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should call axios post when clicking send', async () => {
    const user = userEvent.setup();
    const postMock = jest.fn().mockImplementation(() => Promise.resolve({}));
    jest.mock('app-shared/utils/networking', () => ({
      post: postMock,
    }));
    renderFeedbackForm();
    await user.click(screen.getByRole('button', { name: 'Gi tilbakemelding' }));
    await user.click(screen.getByRole('button', { name: 'Send' }));
    waitFor(() => expect(postMock).toHaveBeenCalledTimes(1));
  });

  it('should show success toast after clicking send', async () => {
    const user = userEvent.setup();
    const postMock = jest.fn().mockImplementation(() => Promise.resolve({}));
    jest.mock('app-shared/utils/networking', () => ({
      post: postMock,
    }));
    renderFeedbackForm();
    await user.click(screen.getByRole('button', { name: 'Gi tilbakemelding' }));
    await user.click(screen.getByRole('button', { name: 'Send' }));
    waitFor(() => expect(screen.getByText('Takk for tilbakemeldingen!')).toBeInTheDocument());
  });
});

const renderFeedbackForm = () => {
  return render(<FeedbackForm />);
};
