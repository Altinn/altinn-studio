import axios from 'axios';
import React from 'react';
import XSDUpload from './XSDUpload';
import type { IXSDUploadProps } from './XSDUpload';
import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('XSDUpload', () => {
  it('should not show file picker by default', () => {
    render();

    const fileInput = screen.queryByTestId('FileSelector-input');
    expect(fileInput).not.toBeInTheDocument();
  });

  it('should show file picker when clicking upload button', async () => {
    render();

    await showUploadDialog();

    const fileInput = screen.getByTestId('FileSelector-input');
    expect(fileInput).toBeInTheDocument();
  });

  it('should show uploading spinner and hide file picker when file upload is in progress', async () => {
    mockedAxios.post.mockImplementation(() => new Promise(jest.fn()));
    const file = new File(['hello'], 'hello.xsd', { type: 'text/xml' });
    render();

    await showUploadDialog();

    expect(
      screen.queryByText(/app_data_modelling\.uploading_xsd/i),
    ).not.toBeInTheDocument();

    const fileInput = screen.getByTestId('FileSelector-input');
    const submitButton = screen.getByRole('button', {
      name: /shared\.submit_upload/i,
    });

    await user.upload(fileInput, file);
    await user.click(submitButton);

    expect(
      screen.getByText(/app_data_modelling\.uploading_xsd/i),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('FileSelector-input')).not.toBeInTheDocument();
  });

  it('should show error text when file upload results in error', async () => {
    mockedAxios.post.mockImplementation(() =>
      Promise.reject(new Error('mocked error')),
    );
    const file = new File(['hello'], 'hello.xsd', { type: 'text/xml' });
    render();

    await showUploadDialog();

    expect(
      screen.queryByText(/form_filler\.file_uploader_validation_error_upload/i),
    ).not.toBeInTheDocument();

    const fileInput = screen.getByTestId('FileSelector-input');
    const submitButton = screen.getByRole('button', {
      name: /shared\.submit_upload/i,
    });

    await user.upload(fileInput, file);
    await user.click(submitButton);

    expect(
      screen.queryByText(/form_filler\.file_uploader_validation_error_upload/i),
    ).toBeInTheDocument();
  });

  it('should call onXSDUploaded callback when upload is successful', async () => {
    mockedAxios.post.mockImplementation(() => Promise.resolve({ status: 200 }));
    const file = new File(['hello'], 'hello.xsd', { type: 'text/xml' });
    const handleUpload = jest.fn();
    render({ onXSDUploaded: handleUpload });

    await showUploadDialog();

    const fileInput = screen.getByTestId('FileSelector-input');
    const submitButton = screen.getByRole('button', {
      name: /shared\.submit_upload/i,
    });

    await user.upload(fileInput, file);
    await user.click(submitButton);

    expect(handleUpload).toHaveBeenCalledWith('hello.xsd');
  });
});

const showUploadDialog = async () => {
  const btn = screen.getByRole('button', {
    name: /app_data_modelling\.upload_xsd/i,
  });

  await user.click(btn);
};

const render = (props: Partial<IXSDUploadProps> = {}) => {
  const allProps = {
    language: {
      administration: {},
    },
    org: 'test-org',
    repo: 'test-repo',
    onXSDUploaded: jest.fn(),
    ...props,
  } as IXSDUploadProps;

  rtlRender(<XSDUpload {...allProps} />);
};
