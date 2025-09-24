import axios from 'axios';
import { submitFeedback } from './submitUtils';

jest.mock('axios');
var mockedAxios = axios as jest.Mocked<typeof axios>;

describe('submitFeedback', () => {
  afterEach(jest.clearAllMocks);

  it('should submit feedback', async () => {
    const answers = { question1: 'answer1' };
    const path = 'path';
    mockedAxios.post.mockResolvedValueOnce({});
    await submitFeedback(answers, path);
    expect(mockedAxios.post).toHaveBeenCalledWith(path, { answers: { ...answers } }, undefined);
  });

  it('should throw error if submission fails', async () => {
    const answers = { question1: 'answer1' };
    const path = 'path';
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('Failed to submit feedback');
    mockedAxios.post.mockRejectedValueOnce(error);
    await expect(submitFeedback(answers, path)).rejects.toThrow(error);
    expect(mockConsoleError).toHaveBeenCalled();
  });
});
