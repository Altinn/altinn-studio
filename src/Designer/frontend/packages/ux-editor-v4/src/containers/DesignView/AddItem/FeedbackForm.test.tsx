import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedbackForm } from './FeedbackForm';
import { post } from 'app-shared/utils/networking';

vi.mock('app-shared/utils/networking', async () => ({
  ...(await vi.importActual('app-shared/utils/networking')),
  post: vi.fn(),
}));
const mockedPost = vi.mocked(post);

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
    mockedPost.mockResolvedValueOnce(null);
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
