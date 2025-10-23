import React from 'react';
import { renderWithProviders } from '../../../../../testing/mocks';
import { ShapeOptions } from '../ImageUploadUtils';
import { ImageUploadSize, type ImageUploadSizeProps } from './ImageUploadSize';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

describe('ImageUploadSize', () => {
  it('should render width and height fields for rectangle shape', () => {
    renderImageUploadSize({
      internalCrop: { shape: ShapeOptions.Rectangle, width: 200, height: 150 },
    });

    const widthField = screen.getByLabelText(textMock('ux_editor.component_properties.crop_width'));
    const heightField = screen.getByLabelText(
      textMock('ux_editor.component_properties.crop_height'),
    );
    expect(widthField).toBeInTheDocument();
    expect(heightField).toBeInTheDocument();
    expect(widthField).toHaveValue(200);
    expect(heightField).toHaveValue(150);
  });

  it('should render diameter field for circle shape', () => {
    renderImageUploadSize({
      internalCrop: { shape: ShapeOptions.Circle, diameter: 120 },
    });
    const diameterField = screen.getByLabelText(
      textMock('ux_editor.component_properties.crop_diameter'),
    );
    expect(diameterField).toBeInTheDocument();
    expect(diameterField).toHaveValue(120);
  });

  it('should call handleNewCrop when width is changed', async () => {
    const user = userEvent.setup();
    const handleNewCropMock = jest.fn();
    renderImageUploadSize({
      internalCrop: { shape: ShapeOptions.Rectangle, width: 200, height: 150 },
      handleNewCrop: handleNewCropMock,
    });

    const widthField = screen.getByLabelText(textMock('ux_editor.component_properties.crop_width'));
    await user.type(widthField, '1');
    expect(handleNewCropMock).toHaveBeenCalledWith({
      shape: ShapeOptions.Rectangle,
      width: 2001,
      height: 150,
    });
  });

  it('should display error message for invalid height input', () => {
    renderImageUploadSize({
      internalCrop: { shape: ShapeOptions.Rectangle, width: 200, height: undefined },
      errors: { height: 'ux_editor.component_properties.crop_size.error' },
    });
    const errorMessage = screen.getByText(
      textMock('ux_editor.component_properties.crop_size.error'),
    );
    expect(errorMessage).toBeInTheDocument();
  });
});

const renderImageUploadSize = (props: Partial<ImageUploadSizeProps> = {}) => {
  const defaultProps: ImageUploadSizeProps = {
    internalCrop: { shape: ShapeOptions.Circle, diameter: 100 },
    errors: {},
    handleNewCrop: jest.fn(),
  };

  const combinedProps = { ...defaultProps, ...props };
  return renderWithProviders(<ImageUploadSize {...combinedProps} />);
};
