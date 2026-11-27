import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppBuilderFeedback } from './AppBuilderFeedback';
import { post } from 'app-shared/utils/networking';

vi.mock('app-shared/utils/networking', async () => ({
  ...(await vi.importActual('app-shared/utils/networking')),
  post: vi.fn(),
}));
const mockedPost = vi.mocked(post);

describe('AppBuilderFeedback', () => {
  beforeEach(() => {
    mockedPost.mockClear();
  });

  it('renders the button that opens the feedback form', () => {
    render(<AppBuilderFeedback />);
    expect(screen.getByRole('button', { name: 'Gi tilbakemelding' })).toBeInTheDocument();
  });

  it('opens the feedback form when the button is clicked', async () => {
    const user = userEvent.setup();
    render(<AppBuilderFeedback />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Gi tilbakemelding' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('submits the answers with the form id', async () => {
    const user = userEvent.setup();
    mockedPost.mockResolvedValueOnce(null);
    render(<AppBuilderFeedback />);
    await user.click(screen.getByRole('button', { name: 'Gi tilbakemelding' }));
    await user.click(screen.getByRole('button', { name: 'Ja' }));
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(mockedPost).toHaveBeenCalledWith(expect.any(String), {
      answers: {
        feedbackFormId: 'app-builder-feedback',
        nyttigJaNei: 'yes',
      },
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
