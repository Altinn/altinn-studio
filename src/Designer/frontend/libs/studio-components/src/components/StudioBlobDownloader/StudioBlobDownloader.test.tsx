import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudioBlobDownloader } from './StudioBlobDownloader';
import type { StudioBlobDownloaderProps } from './StudioBlobDownloader';
import { BlobDownloader } from '@studio/pure-functions';

describe('StudioBlobDownloader', () => {
  type ExampleData = {
    testField1: string;
    testField2: number;
  };

  const mockData: ExampleData = {
    testField1: 'test',
    testField2: 1,
  };

  const handleDownloadClickMock = jest.fn();

  beforeAll(() => {
    jest
      .spyOn(BlobDownloader.prototype, 'handleDownloadClick')
      .mockImplementation(handleDownloadClickMock);
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('should render', () => {
    renderStudioBlobDownloader({ data: JSON.stringify(mockData) });
    expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument();
  });

  it('should create a link to Blob with the correct data', async () => {
    jest.spyOn(console, 'error').mockImplementationOnce(() => {});
    renderStudioBlobDownloader({ data: JSON.stringify(mockData) });
    const user = userEvent.setup();
    const downloadButton = screen.getByRole('button', { name: 'Download' });
    await user.click(downloadButton);
    expect(handleDownloadClickMock).toHaveBeenCalled();
  });
});

const renderStudioBlobDownloader = (props: Partial<StudioBlobDownloaderProps>): void => {
  const defaultProps: StudioBlobDownloaderProps = {
    data: '{}',
    fileName: 'test.json',
    linkText: 'Download',
  };
  render(<StudioBlobDownloader {...defaultProps} {...props} />);
};
