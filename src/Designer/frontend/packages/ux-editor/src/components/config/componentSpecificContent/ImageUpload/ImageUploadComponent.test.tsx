import React from 'react';
import { ComponentType } from 'app-shared/types/ComponentType';
import { ImageUploadComponent, type ImageUploadComponentProps } from './ImageUploadComponent';
import { ShapeOptions } from './ImageUploadUtils';
import { renderWithProviders } from '../../../../testing/mocks';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

const defaultComponent = {
  id: 'imageUpload1',
  type: ComponentType.ImageUpload,
  label: 'Upload Image',
  itemType: 'COMPONENT' as const,
  crop: { shape: ShapeOptions.Circle, diameter: 100 },
};

describe('ImageUploadComponent', () => {
  it('should open card when button is clicked', async () => {
    const user = userEvent.setup();
    renderImageUploadComponent();
    const button = screen.getByRole('button', {
      name: textMock('ux_editor.component_properties.crop_shape'),
    });
    await user.click(button);
    const cardTitle = screen.getByText(textMock('ux_editor.component_properties.crop_card.title'));
    expect(cardTitle).toBeInTheDocument();
  });

  it('should call handleComponentChange with new crop values when changes are saved', async () => {
    const user = userEvent.setup();
    const handleComponentChangeMock = jest.fn();
    renderImageUploadComponent({ handleComponentChange: handleComponentChangeMock });
    const button = screen.getByRole('button', {
      name: textMock('ux_editor.component_properties.crop_shape'),
    });
    await user.click(button);
    const shapeSelect = screen.getByLabelText(
      textMock('ux_editor.component_properties.crop_shape'),
    );
    await user.selectOptions(shapeSelect, ShapeOptions.Rectangle);
    const saveButton = screen.getByRole('button', { name: textMock('general.save') });
    await user.click(saveButton);
    expect(handleComponentChangeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        crop: {
          shape: ShapeOptions.Rectangle,
          width: 250,
          height: 250,
        },
      }),
    );
  });
});

const renderImageUploadComponent = (props: Partial<ImageUploadComponentProps> = {}) => {
  const defaultProps: ImageUploadComponentProps = {
    component: {
      ...defaultComponent,
      ...props.component,
    },
    handleComponentChange: jest.fn(),
  };

  const combinedProps = { ...defaultProps, ...props };
  return renderWithProviders(<ImageUploadComponent {...combinedProps} />);
};
