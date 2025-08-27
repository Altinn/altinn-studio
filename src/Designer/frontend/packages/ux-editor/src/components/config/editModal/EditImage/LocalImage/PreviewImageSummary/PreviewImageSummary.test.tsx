import React from 'react';
import { screen } from '@testing-library/react';
import type { PreviewImageSummaryProps } from './PreviewImageSummary';
import { PreviewImageSummary } from './PreviewImageSummary';
import { renderWithProviders } from '../../../../../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

const existingImageUrl = 'existingImageUrl';
const onDeleteImageMock = jest.fn();
const onDeleteImageReferenceOnlyMock = jest.fn();

const defaultProps: PreviewImageSummaryProps = {
  existingImageUrl,
  onDeleteImage: onDeleteImageMock,
  onDeleteImageReferenceOnly: onDeleteImageReferenceOnlyMock,
};

describe('PreviewImageSummary', () => {
  it('previews the fileName', () => {
    renderPreviewImageSummary();
    const fileName = screen.getByRole('paragraph', { name: existingImageUrl });
    expect(fileName).toBeInTheDocument();
  });

  it('opens delete options modal with correct texts when clicking delete button', async () => {
    const user = userEvent.setup();
    renderPreviewImageSummary();
    const deleteButton = screen.getByRole('button', {
      name: textMock('ux_editor.properties_panel.images.delete_image_reference_title'),
    });
    await user.click(deleteButton);
    const deleteOptionsModalHeading = screen.getByRole('heading', {
      name: textMock('ux_editor.properties_panel.images.delete_image_options_modal_title'),
    });
    const deleteOptionsModalInfoDeleteRefOnly = screen.getByText(
      textMock('ux_editor.properties_panel.images.delete_image_options_modal_content_only_ref'),
    );
    const deleteOptionsModalInfoDeleteRefAndImage = screen.getByText(
      textMock(
        'ux_editor.properties_panel.images.delete_image_options_modal_content_ref_and_from_library',
      ),
    );
    expect(deleteOptionsModalHeading).toBeInTheDocument();
    expect(deleteOptionsModalInfoDeleteRefOnly).toBeInTheDocument();
    expect(deleteOptionsModalInfoDeleteRefAndImage).toBeInTheDocument();
  });

  it('calls onDeleteImage when clicking delete image in modal', async () => {
    const user = userEvent.setup();
    renderPreviewImageSummary();
    const deleteButton = screen.getByRole('button', {
      name: textMock('ux_editor.properties_panel.images.delete_image_reference_title'),
    });
    await user.click(deleteButton);
    const deleteImageButton = screen.getByRole('button', {
      name: textMock(
        'ux_editor.properties_panel.images.delete_image_options_modal_button_ref_and_from_library',
      ),
    });
    await user.click(deleteImageButton);
    expect(onDeleteImageMock).toHaveBeenCalledTimes(1);
    expect(onDeleteImageMock).toHaveBeenCalledWith(existingImageUrl);
  });

  it('calls onDeleteImageReferenceOnly when clicking delete image reference only in modal', async () => {
    const user = userEvent.setup();
    renderPreviewImageSummary();
    const deleteButton = screen.getByRole('button', {
      name: textMock('ux_editor.properties_panel.images.delete_image_reference_title'),
    });
    await user.click(deleteButton);
    const deleteImageRefOnlyButton = screen.getByRole('button', {
      name: textMock(
        'ux_editor.properties_panel.images.delete_image_options_modal_button_only_ref',
      ),
    });
    await user.click(deleteImageRefOnlyButton);
    expect(onDeleteImageReferenceOnlyMock).toHaveBeenCalledTimes(1);
    expect(onDeleteImageReferenceOnlyMock).toHaveBeenCalledWith();
  });
});

const renderPreviewImageSummary = (props?: Partial<PreviewImageSummaryProps>) => {
  renderWithProviders(<PreviewImageSummary {...defaultProps} {...props} />);
};
