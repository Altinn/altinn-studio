import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomFeedbackForm } from './CustomFeedbackForm';
import axios from 'axios';

jest.mock('axios');
var mockedAxios = axios as jest.Mocked<typeof axios>;

describe('CustomFeedbackForm', () => {
  afterAll(() => {
    jest.clearAllMocks();
  });

  it('should render feedback form', () => {
    renderCustomFeedbackForm();
    expect(screen.getByRole('button', { name: 'Gi tilbakemelding' })).toBeInTheDocument();
  });

  it('should open the feedback form when clicking trigger', async () => {
    const user = userEvent.setup();
    renderCustomFeedbackForm();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Gi tilbakemelding' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('should close the feedback form when clicking send', async () => {
    const user = userEvent.setup();
    mockedAxios.post.mockResolvedValueOnce({});
    renderCustomFeedbackForm();
    await user.click(screen.getByRole('button', { name: 'Gi tilbakemelding' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

const renderCustomFeedbackForm = () => {
  return render(<CustomFeedbackForm />);
};
