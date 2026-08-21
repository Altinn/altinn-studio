import { createRef } from 'react';

import { render, screen } from '@testing-library/react';

import { Dropzone } from './Dropzone';

describe('Dropzone', () => {
  const baseProps = {
    id: 'test-dropzone',
    readOnly: false,
    hasValidationMessages: false,
    onDrop: vi.fn(),
  };

  it('renders the dropzone with children', () => {
    render(
      <Dropzone {...baseProps}>
        <span>Drop files here</span>
      </Dropzone>,
    );

    expect(screen.getByText('Drop files here')).toBeInTheDocument();
    expect(document.getElementById('altinn-drop-zone-test-dropzone')).toBeInTheDocument();
  });

  it('renders the max file size label when maxFileSize is provided', () => {
    render(
      <Dropzone {...baseProps} maxFileSize={{ sizeInMB: 25, text: 'Max 25 MB' }}>
        <span>Drop files here</span>
      </Dropzone>,
    );

    expect(screen.getByText('Max 25 MB')).toBeInTheDocument();
  });

  it('does not render the max file size label when maxFileSize is omitted', () => {
    render(
      <Dropzone {...baseProps}>
        <span>Drop files here</span>
      </Dropzone>,
    );

    expect(document.getElementById('file-upload-max-size-test-dropzone')).not.toBeInTheDocument();
  });

  it('applies the validation error class when hasValidationMessages is true', () => {
    render(
      <Dropzone {...baseProps} hasValidationMessages>
        <span>Drop files here</span>
      </Dropzone>,
    );

    const dropzone = document.getElementById('altinn-drop-zone-test-dropzone');
    expect(dropzone?.className).toMatch(/validationError/);
    expect(dropzone?.className).toMatch(/fileUploadInvalid/);
  });

  it('forwards labelId to aria-labelledby and combines describedBy with the max-size label id', () => {
    render(
      <Dropzone
        {...baseProps}
        labelId='my-label'
        describedBy='my-description'
        maxFileSize={{ sizeInMB: 10, text: 'Max 10 MB' }}
      >
        <span>Drop files here</span>
      </Dropzone>,
    );

    const dropzone = document.getElementById('altinn-drop-zone-test-dropzone');
    expect(dropzone).toHaveAttribute('aria-labelledby', 'my-label');
    expect(dropzone).toHaveAttribute(
      'aria-describedby',
      'my-description file-upload-max-size-test-dropzone',
    );
  });

  it('exposes the input element through the supplied inputRef', () => {
    const inputRef = createRef<HTMLInputElement>();

    render(
      <Dropzone {...baseProps} inputRef={inputRef}>
        <span>Drop files here</span>
      </Dropzone>,
    );

    expect(inputRef.current).toBeInstanceOf(HTMLInputElement);
    expect(inputRef.current?.id).toBe('test-dropzone');
  });

  it('applies a custom className alongside the default styles', () => {
    render(
      <Dropzone {...baseProps} className='custom-class'>
        <span>Drop files here</span>
      </Dropzone>,
    );

    const dropzone = document.getElementById('altinn-drop-zone-test-dropzone');
    expect(dropzone?.className).toContain('custom-class');
  });
});
