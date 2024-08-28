import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudioBlobDownloader } from './StudioBlobDownloader';
import type { StudioBlobDownloaderProps } from './StudioBlobDownloader';

describe('StudioBlobDownloader', () => {
  type ExampleData = {
    testField1: string;
    testField2: number;
  };

  const mockData: ExampleData = {
    testField1: 'test',
    testField2: 1,
  };

  global.URL.createObjectURL = jest.fn();
  global.URL.revokeObjectURL = jest.fn();

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('should render', () => {
    renderStudioBlobDownloader({ data: JSON.stringify(mockData) });
    expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument();
  });

  it('should create a link to Blob with the correct data', async () => {
    jest.spyOn(console, 'error').mockImplementationOnce(() => {}); // Suppress expected jsdom error message from attempted download/navigate
    renderStudioBlobDownloader({ data: JSON.stringify(mockData) });
    const user = userEvent.setup();
    const downloadButton = screen.getByRole('button', { name: 'Download' });
    await waitFor(() => user.click(downloadButton));
    const testBlob = new Blob([JSON.stringify(mockData)], { type: 'application/json' });
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(testBlob);
  });
});

const renderStudioBlobDownloader = (props: Partial<StudioBlobDownloaderProps>) => {
  const defaultProps: StudioBlobDownloaderProps = {
    data: '{}',
    fileName: 'test.json',
    linkText: 'Download',
  };
  render(<StudioBlobDownloader {...defaultProps} {...props} />);
};
