import React from 'react';
import { act, render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { IFileSelectorProps } from './FileSelector';
import FileSelector from './FileSelector';
import { textMock } from '../../../../testing/mocks/i18nMock';
import { Button } from '@digdir/design-system-react';
import * as testids from '../../../../testing/testids';

const user = userEvent.setup();

const render = (props: Partial<IFileSelectorProps> = {}) => {
  const allProps: IFileSelectorProps = {
    submitHandler: jest.fn(),
    busy: false,
    formFileName: '',
    ...props,
  };

  rtlRender(<FileSelector {...allProps} />);
};

const customButtonText = 'Lorem ipsum';
const testCustomButtonRenderer = (onClick: React.MouseEventHandler<HTMLButtonElement>) => (
  <Button onClick={onClick}>{customButtonText}</Button>
);

describe('FileSelector', () => {
  it('should not call submitHandler when no files are selected', async () => {
    const handleSubmit = jest.fn();
    render({ submitHandler: handleSubmit });

    const fileInput = screen.getByTestId(testids.fileSelectorInput);
    await act(() => user.upload(fileInput, null));

    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('should call submitHandler when a file is selected', async () => {
    const file = new File(['hello'], 'hello.png', { type: 'image/png' });
    const handleSubmit = jest.fn();
    render({ submitHandler: handleSubmit });

    const fileInput = screen.getByTestId(testids.fileSelectorInput);
    await act(() => user.upload(fileInput, file));

    expect(handleSubmit).toHaveBeenCalledWith(expect.any(FormData), 'hello.png');
  });

  it('Should show text on the button by default', async () => {
    render();
    expect(screen.getByRole('button', { name: textMock('app_data_modelling.upload_xsd') })).toBeInTheDocument();
  });

  it('Should show custom button', async () => {
    render({ submitButtonRenderer: testCustomButtonRenderer });
    expect(screen.getByRole('button', { name: customButtonText })).toBeInTheDocument();
  });

  it('Should call file input onClick handler when the default upload button is clicked', async () => {
    render();
    const button = screen.getByRole('button', { name: textMock('app_data_modelling.upload_xsd') });
    const fileInput = screen.getByTestId(testids.fileSelectorInput);
    fileInput.onclick = jest.fn();
    await act(() => user.click(button));
    expect(fileInput.onclick).toHaveBeenCalled();
  });

  it('Should call file input onClick handler when the custom upload button is clicked', async () => {
    render({ submitButtonRenderer: testCustomButtonRenderer });
    const button = screen.getByRole('button', { name: customButtonText });
    const fileInput = screen.getByTestId(testids.fileSelectorInput);
    fileInput.onclick = jest.fn();
    await act(() => user.click(button));
    expect(fileInput.onclick).toHaveBeenCalled();
  });
});
