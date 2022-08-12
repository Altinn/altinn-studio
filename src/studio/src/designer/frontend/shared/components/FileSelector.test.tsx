import { render as rtlRender, screen } from '@testing-library/react';
import userEvent, {
  PointerEventsCheckLevel,
} from '@testing-library/user-event';
import React from 'react';
import FileSelector from './FileSelector';
import type { IFileSelectorProps } from './FileSelector';

const user = userEvent.setup();

describe('FileSelector', () => {
  it('should not call submitHandler when no files are selected and submit button is clicked', async () => {
    const userWithNoPointerEventCheck = userEvent.setup({
      pointerEventsCheck: PointerEventsCheckLevel.Never,
    });
    const handleSubmit = jest.fn();
    render({ submitHandler: handleSubmit });

    const submitButton = screen.getByRole('button', {
      name: /upload/i,
    });
    await userWithNoPointerEventCheck.click(submitButton);
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('should call submitHandler when a file is selected and submit button is clicked', async () => {
    const file = new File(['hello'], 'hello.png', { type: 'image/png' });
    const handleSubmit = jest.fn();
    render({ submitHandler: handleSubmit });

    const fileInput = screen.getByTestId('FileSelector-input');
    await user.upload(fileInput, file);

    const submitButton = screen.getByRole('button', {
      name: /upload/i,
    });
    await user.click(submitButton);
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
