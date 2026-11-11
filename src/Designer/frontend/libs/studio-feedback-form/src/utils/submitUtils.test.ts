import { describe, expect, it, vi } from 'vitest';
import { post } from 'app-shared/utils/networking';
import { submitFeedback } from './submitUtils';

vi.mock('app-shared/utils/networking', async () => ({
  ...(await vi.importActual('app-shared/utils/networking')),
  post: vi.fn(),
}));
const mockedPost = vi.mocked(post);

describe('submitFeedback', () => {
  it('should submit feedback', async () => {
    const answers = { question1: 'answer1' };
    const path = 'path';
    mockedPost.mockResolvedValueOnce(null);
    await submitFeedback(answers, path);
    expect(mockedPost).toHaveBeenCalledWith(path, { answers: { ...answers } });
  });

  it('should throw error if submission fails', async () => {
    const answers = { question1: 'answer1' };
    const path = 'path';
    const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('Failed to submit feedback');
    mockedPost.mockRejectedValueOnce(error);
    await expect(submitFeedback(answers, path)).rejects.toThrow(error);
    expect(mockConsoleError).toHaveBeenCalled();
  });
});
