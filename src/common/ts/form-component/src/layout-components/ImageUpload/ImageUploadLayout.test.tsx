import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { ImageUploadLayout } from './ImageUploadLayout';
import type { StoredImage } from './imageUploadUtils';

const uploadedImage: StoredImage = {
  uploaded: true,
  deleting: false,
  data: { id: 'att-1', filename: 'bilde.png' },
};

const overrides = {
  'my.title': 'Profilbilde',
  'my.help': 'Last opp et bilde',
  'image_upload_component.button_delete': 'Slett bildet',
  'image_upload_component.valid_file_types': 'Gyldige filtyper: PNG, JPG',
};

describe('ImageUploadLayout', () => {
  it('renders the label from a title text resource key', () => {
    renderWithTranslations(<ImageUploadLayout componentId='img-1' title='my.title' />, {
      overrides,
    });
    expect(screen.getByText('Profilbilde')).toBeInTheDocument();
  });

  it('renders the dropzone with valid file types in the empty state', () => {
    renderWithTranslations(<ImageUploadLayout componentId='img-1' title='my.title' />, {
      overrides,
    });
    expect(screen.getByText('Gyldige filtyper: PNG, JPG')).toBeInTheDocument();
  });

  it('renders the form-content wrapper for the componentId', () => {
    renderWithTranslations(<ImageUploadLayout componentId='img-1' title='my.title' />, {
      overrides,
    });
    expect(document.getElementById('form-content-img-1')).toBeInTheDocument();
  });

  it('renders the validation area when validationMessages is provided', () => {
    renderWithTranslations(
      <ImageUploadLayout
        componentId='img-1'
        title='my.title'
        validationMessages={<span>Feilmelding</span>}
      />,
      { overrides },
    );
    expect(screen.getByText('Feilmelding')).toBeInTheDocument();
  });

  it('renders the stored image preview and delete button when an image is stored', () => {
    renderWithTranslations(
      <ImageUploadLayout
        componentId='img-1'
        title='my.title'
        storedImage={uploadedImage}
        imageUrl='/img/att-1'
      />,
      { overrides },
    );
    expect(screen.getByRole('img', { name: 'bilde.png' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Slett bildet' })).toBeInTheDocument();
  });

  it('calls onDelete when the delete button is clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    renderWithTranslations(
      <ImageUploadLayout
        componentId='img-1'
        title='my.title'
        storedImage={uploadedImage}
        imageUrl='/img/att-1'
        onDelete={onDelete}
      />,
      { overrides },
    );
    await user.click(screen.getByRole('button', { name: 'Slett bildet' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('disables the delete button when readOnly', () => {
    renderWithTranslations(
      <ImageUploadLayout
        componentId='img-1'
        title='my.title'
        readOnly
        storedImage={uploadedImage}
        imageUrl='/img/att-1'
      />,
      { overrides },
    );
    expect(screen.getByRole('button', { name: 'Slett bildet' })).toBeDisabled();
  });

  it('disables the delete button while the image is still uploading', () => {
    renderWithTranslations(
      <ImageUploadLayout
        componentId='img-1'
        title='my.title'
        storedImage={{ ...uploadedImage, uploaded: false }}
        imageUrl='/img/att-1'
      />,
      { overrides },
    );
    expect(screen.getByRole('button', { name: 'Slett bildet' })).toBeDisabled();
  });
});
