import React from 'react';
import { screen } from '@testing-library/react';
import { ImageUploadCard, type ImageUploadCardProps } from './ImageUploadCard';
import { renderWithProviders } from '../../../../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { ShapeOptions } from '../ImageUploadUtils';

describe('ImageUploadCard', () => {
  it('should render the ImageUploadCard component', () => {
    renderImageUploadCard();
    const cardTitle = screen.getByText(textMock('ux_editor.component_properties.crop_card.title'));
    expect(cardTitle).toBeInTheDocument();
  });

  it('save button should be disabled initially when there are no changes', () => {
    renderImageUploadCard();
    const saveButton = screen.getByRole('button', { name: textMock('general.save') });
    expect(saveButton).toBeDisabled();
  });

  it('should close the card when clicking cancel button', async () => {
    const user = userEvent.setup();
    const setOpenCardMock = jest.fn();
    renderImageUploadCard({ setOpenCard: setOpenCardMock });
    const cancelButton = screen.getByRole('button', { name: textMock('general.cancel') });
    await user.click(cancelButton);
    expect(setOpenCardMock).toHaveBeenCalledWith(false);
  });

  it('should call handleSaveChanges with correct values when clicking save button after making changes', async () => {
    const user = userEvent.setup();
    const handleSaveChangesMock = jest.fn();
    renderImageUploadCard({ handleSaveChanges: handleSaveChangesMock });
    const shapeSelect = screen.getByLabelText(
      textMock('ux_editor.component_properties.crop_shape'),
    );
    await user.selectOptions(shapeSelect, ShapeOptions.Rectangle);

    const saveButton = screen.getByRole('button', { name: textMock('general.save') });
    await user.click(saveButton);
    expect(handleSaveChangesMock).toHaveBeenCalledWith({
      shape: ShapeOptions.Rectangle,
      width: 250,
      height: 250,
    });
  });
});

const renderImageUploadCard = (props: Partial<ImageUploadCardProps> = {}) => {
  const defaultProps: ImageUploadCardProps = {
    externalCrop: { shape: ShapeOptions.Circle, diameter: 100 },
    handleSaveChanges: jest.fn(),
    setOpenCard: jest.fn(),
  };
  const combinedProps = { ...defaultProps, ...props };
  return renderWithProviders(<ImageUploadCard {...combinedProps} />);
};
