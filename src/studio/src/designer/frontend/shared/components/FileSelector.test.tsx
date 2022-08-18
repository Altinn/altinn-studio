import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import FileSelector from './FileSelector';
import type { IFileSelectorProps } from './FileSelector';

const user = userEvent.setup();

describe('FileSelector', () => {
  it('should not call submitHandler when no files are selected', async () => {
    const handleSubmit = jest.fn();
    render({ submitHandler: handleSubmit });

    const fileInput = screen.getByTestId('FileSelector-input');
    await user.upload(fileInput, null);

    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('should call submitHandler when a file is selected', async () => {
    const file = new File(['hello'], 'hello.png', { type: 'image/png' });
    const handleSubmit = jest.fn();
    render({ submitHandler: handleSubmit });

    const fileInput = screen.getByTestId('FileSelector-input');
    await user.upload(fileInput, file);

    expect(handleSubmit).toHaveBeenCalledWith(
      expect.any(FormData),
      'hello.png',
    );
  });
});

const render = (props: Partial<IFileSelectorProps> = {}) => {
  const allProps = {
    language: {
      general: { label: 'download' },
      shared: { submit_upload: 'upload' },
    },
    ...props,
  } as IFileSelectorProps;

  rtlRender(<FileSelector {...allProps} />);
};
