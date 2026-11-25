import type { ComponentProps } from 'react';

import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithTranslations } from '../../test/renderWithTranslations';
import { FileUploadLayout } from './FileUploadLayout';

const overrides = {
  'upload.title': 'Vedlegg',
  'upload.description': 'Legg ved kvitteringen',
};

const render = (props?: Partial<ComponentProps<typeof FileUploadLayout>>) =>
  renderWithTranslations(
    <FileUploadLayout
      componentId='my-upload'
      maxFileSizeInMB={10}
      maxNumberOfAttachments={3}
      numberOfAttachments={0}
      onDrop={() => {}}
      {...props}
    />,
    { overrides },
  );

const dropzoneInput = (container: HTMLElement) =>
  container.querySelector('#my-upload') as HTMLInputElement | null;

describe('FileUploadLayout', () => {
  it('renders the label, its description and the required tag', () => {
    render({ title: 'upload.title', description: 'upload.description', required: true });
    expect(screen.getByText('Vedlegg')).toBeInTheDocument();
    expect(screen.getByText('Legg ved kvitteringen')).toBeInTheDocument();
    expect(document.querySelector('[data-indicator="required"]')).toBeInTheDocument();
  });

  it('renders the drop zone with its texts', () => {
    const { container } = render();
    expect(dropzoneInput(container)).toBeInTheDocument();
    expect(screen.getByText('Maximum file size 10 MB')).toBeInTheDocument();
    expect(document.getElementById('file-upload-format-my-upload')).toHaveTextContent(
      'Valid file types are: all',
    );
    expect(screen.getByText('Number of files 0/3.')).toBeInTheDocument();
  });

  it('lists the custom file endings', () => {
    render({ hasCustomFileEndings: true, validFileEndings: '.pdf,.png' });
    expect(document.getElementById('file-upload-format-my-upload')).toHaveTextContent(
      'Valid file types are: .pdf,.png',
    );
  });

  it('passes dropped files to onDrop', async () => {
    const onDrop = vi.fn();
    const { container } = render({ onDrop });
    const file = new File(['x'], 'kvittering.pdf', { type: 'application/pdf' });
    await userEvent.upload(dropzoneInput(container)!, file);
    await waitFor(() => expect(onDrop).toHaveBeenCalled());
    expect(onDrop.mock.calls[0][0]).toEqual([file]);
    expect(onDrop.mock.calls[0][1]).toEqual([]);
  });

  it('hides the drop zone and shows a notice when read-only', () => {
    const { container } = render({ readOnly: true, numberOfAttachments: 1 });
    expect(dropzoneInput(container)).not.toBeInTheDocument();
    expect(screen.getByText('Attachments cannot be changed.')).toBeInTheDocument();
    expect(screen.getByText('Number of files 1.')).toBeInTheDocument();
  });

  it('hides the drop zone when the maximum number of files is reached', () => {
    const { container } = render({ numberOfAttachments: 3 });
    expect(dropzoneInput(container)).not.toBeInTheDocument();
    expect(screen.getByText('Number of files 3/3.')).toBeInTheDocument();
  });

  describe('simple display mode', () => {
    it('replaces the drop zone with an add button once a file is attached', () => {
      const onAddClick = vi.fn();
      const { container } = render({ displayMode: 'simple', numberOfAttachments: 1, onAddClick });
      expect(dropzoneInput(container)).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Add more attachments' }));
      expect(onAddClick).toHaveBeenCalled();
    });

    it('shows the drop zone again when it is opened', () => {
      const { container } = render({
        displayMode: 'simple',
        numberOfAttachments: 1,
        dropzoneOpen: true,
      });
      expect(dropzoneInput(container)).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Add more attachments' }),
      ).not.toBeInTheDocument();
    });
  });

  it('renders the file list, validation messages and failed attachments', () => {
    render({
      fileList: <span>file list</span>,
      validationMessages: <span>validation</span>,
      failedAttachments: <span>failed</span>,
    });
    expect(screen.getByText('file list')).toBeInTheDocument();
    expect(screen.getByText('validation')).toBeInTheDocument();
    expect(screen.getByText('failed')).toBeInTheDocument();
  });
});
