import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { IFileSelectorProps } from './FileSelector';
import { FileSelector } from './FileSelector';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { Button } from '@digdir/design-system-react';
import { fileSelectorInputId } from '@studio/testing/testids';
import { toast } from 'react-toastify';

jest.mock('react-toastify', () => ({
  toast: {
    error: jest.fn(),
  },
}));

const user = userEvent.setup();

const renderFileSelector = (props: Partial<IFileSelectorProps> = {}) => {
  const allProps: IFileSelectorProps = {
    submitHandler: jest.fn(),
    busy: false,
    formFileName: '',
    ...props,
  };

  render(<FileSelector {...allProps} />);
};

const customButtonText = 'Lorem ipsum';
const testCustomButtonRenderer = (onClick: React.MouseEventHandler<HTMLButtonElement>) => (
  <Button onClick={onClick}>{customButtonText}</Button>
);

describe('FileSelector', () => {
  it('should not call submitHandler when no files are selected', async () => {
    const handleSubmit = jest.fn();
    renderFileSelector({ submitHandler: handleSubmit });

    const fileInput = screen.getByTestId(fileSelectorInputId);
    await user.upload(fileInput, null);

    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('should call submitHandler when a file is selected', async () => {
    const file = new File(['hello'], 'hello.png', { type: 'image/png' });
    const handleSubmit = jest.fn();
    renderFileSelector({ submitHandler: handleSubmit });

    const fileInput = screen.getByTestId(fileSelectorInputId);
    await user.upload(fileInput, file);

    expect(handleSubmit).toHaveBeenCalledWith(expect.any(FormData), 'hello.png');
  });

  it('Should show text on the button by default', async () => {
    renderFileSelector();
    expect(
      screen.getByRole('button', { name: textMock('app_data_modelling.upload_xsd') }),
    ).toBeInTheDocument();
  });

  it('Should show custom button', async () => {
    renderFileSelector({ submitButtonRenderer: testCustomButtonRenderer });
    expect(screen.getByRole('button', { name: customButtonText })).toBeInTheDocument();
  });

  it('Should call file input onClick handler when the default upload button is clicked', async () => {
    renderFileSelector();
    const button = screen.getByRole('button', { name: textMock('app_data_modelling.upload_xsd') });
    const fileInput = screen.getByTestId(fileSelectorInputId);
    fileInput.onclick = jest.fn();
    await user.click(button);
    expect(fileInput.onclick).toHaveBeenCalled();
  });

  it('Should call file input onClick handler when the custom upload button is clicked', async () => {
    renderFileSelector({ submitButtonRenderer: testCustomButtonRenderer });
    const button = screen.getByRole('button', { name: customButtonText });
    const fileInput = screen.getByTestId(fileSelectorInputId);
    fileInput.onclick = jest.fn();
    await user.click(button);
    expect(fileInput.onclick).toHaveBeenCalled();
  });

  it('Should show a toast error when an invalid file name is uploaded', async () => {
    const invalidFileName = '123_invalid_name"%#$&';
    const file = new File(['datamodell'], invalidFileName);
    renderFileSelector();
    const fileInput = screen.getByTestId(fileSelectorInputId);
    await user.upload(fileInput, file);
    expect(toast.error).toHaveBeenCalledWith(
      textMock('app_data_modelling.upload_xsd_invalid_error'),
    );
  });
});
