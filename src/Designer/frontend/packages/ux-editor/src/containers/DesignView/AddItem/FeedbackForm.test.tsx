import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedbackForm } from './FeedbackForm';
import axios from 'axios';

jest.mock('axios');
var mockedAxios = axios as jest.Mocked<typeof axios>;

describe('FeedbackForm', () => {
  afterAll(() => {
    jest.clearAllMocks();
  });

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
    mockedAxios.post.mockResolvedValueOnce({});
    renderFeedbackForm();
    await user.click(screen.getByRole('button', { name: 'Gi tilbakemelding' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

const renderFeedbackForm = () => {
  return render(<FeedbackForm />);
};
