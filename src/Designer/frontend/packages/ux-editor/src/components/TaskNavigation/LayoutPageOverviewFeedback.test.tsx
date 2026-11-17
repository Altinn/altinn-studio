import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LayoutPageOverviewFeedback } from './LayoutPageOverviewFeedback';
import { post } from 'app-shared/utils/networking';

vi.mock('app-shared/utils/networking', async () => ({
  ...(await vi.importActual('app-shared/utils/networking')),
  post: vi.fn(),
}));
const mockedPost = vi.mocked(post);

describe('LayoutPageOverviewFeedback', () => {
  beforeEach(() => {
    mockedPost.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should render feedback form', () => {
    renderLayoutPageOverviewFeedback();
    expect(screen.getByRole('button', { name: 'Gi tilbakemelding' })).toBeInTheDocument();
  });

  it('should open the feedback form when clicking trigger', async () => {
    const user = userEvent.setup();
    renderLayoutPageOverviewFeedback();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Gi tilbakemelding' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('should close the feedback form when clicking send', async () => {
    const user = userEvent.setup();
    mockedPost.mockResolvedValueOnce(null);
    renderLayoutPageOverviewFeedback();
    await user.click(screen.getByRole('button', { name: 'Gi tilbakemelding' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockedPost).toHaveBeenCalled();
  });

  it('should submit form data correctly', async () => {
    const user = userEvent.setup({ delay: 100 });
    mockedPost.mockResolvedValueOnce(null);
    renderLayoutPageOverviewFeedback();
    await user.click(screen.getByRole('button', { name: 'Gi tilbakemelding' }));
    await user.click(screen.getByRole('button', { name: 'Ja' }));
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(mockedPost).toHaveBeenCalledWith(expect.any(String), {
      answers: {
        feedbackFormId: 'utforming-overview',
        likerUtformingJaNei: 'yes',
      },
    });
  });
});

const renderLayoutPageOverviewFeedback = () => {
  return render(<LayoutPageOverviewFeedback />);
};
