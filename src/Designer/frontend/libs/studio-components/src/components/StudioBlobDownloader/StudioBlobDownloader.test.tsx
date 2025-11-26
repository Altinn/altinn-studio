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

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  it('should render', () => {
    renderStudioBlobDownloader({ getData: () => JSON.stringify(mockData) });
    expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument();
  });

  it('should not call getData before button is clicked', () => {
    const getDataMock = jest.fn(() => JSON.stringify(mockData));
    renderStudioBlobDownloader({ getData: getDataMock });

    expect(getDataMock).not.toHaveBeenCalled();
  });

  it('should call getData when download button is clicked', async () => {
    const getDataMock = jest.fn(() => JSON.stringify(mockData));
    renderStudioBlobDownloader({ getData: getDataMock });

    const user = userEvent.setup();
    const downloadButton = screen.getByRole('button', { name: 'Download' });
    await user.click(downloadButton);

    expect(getDataMock).toHaveBeenCalledTimes(1);
  });

  it('should create a link to Blob with the correct data from getData', async () => {
    jest.spyOn(console, 'error').mockImplementationOnce(() => {});
    renderStudioBlobDownloader({ getData: () => JSON.stringify(mockData) });

    const user = userEvent.setup();
    const downloadButton = screen.getByRole('button', { name: 'Download' });
    await user.click(downloadButton);

    expect(handleDownloadClickMock).toHaveBeenCalled();
  });

  it('should generate fresh data on each download', async () => {
    let counter = 0;
    const getDataMock = jest.fn(() => JSON.stringify({ counter: ++counter }));
    renderStudioBlobDownloader({ getData: getDataMock });

    const user = userEvent.setup();
    const downloadButton = screen.getByRole('button', { name: 'Download' });

    await user.click(downloadButton);
    expect(getDataMock).toHaveBeenCalledTimes(1);

    await user.click(downloadButton);
    expect(getDataMock).toHaveBeenCalledTimes(2);
  });
});

const renderStudioBlobDownloader = (props: Partial<StudioBlobDownloaderProps>): void => {
  const defaultProps: StudioBlobDownloaderProps = {
    getData: () => '{}',
    fileName: 'test.json',
    linkText: 'Download',
  };
  render(<StudioBlobDownloader {...defaultProps} {...props} />);
};
