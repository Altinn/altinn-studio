import React from 'react';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { IGenericEditComponent } from '../../componentConfig';
import { ImageComponent } from './ImageComponent';
import { renderWithMockStore } from '../../../../testing/mocks';
import { ComponentType } from 'app-shared/types/ComponentType';
import { mockUseTranslation } from '../../../../../../../testing/mocks/i18nMock';
import type { FormImageComponent } from '../../../../types/FormComponent';

const user = userEvent.setup();

const componentData: FormImageComponent = {
  id: '4a66b4ea-13f1-4187-864a-fd4bb6e8cf88',
  textResourceBindings: {},
  type: ComponentType.Image,
  image: {
    src: {},
  },
  itemType: 'COMPONENT',
  dataModelBindings: {},
};
const texts = {
  'ux_editor.modal_properties_image_src_value_label': 'Source',
  'ux_editor.modal_properties_image_placement_label': 'Placement',
  'ux_editor.modal_properties_image_alt_text_label': 'Alt text',
  'ux_editor.modal_properties_image_width_label': 'Width',
  'ux_editor.modal_properties_image_placement_left': 'Left',
  'ux_editor.modal_properties_image_placement_center': 'Center',
  'ux_editor.modal_properties_image_placement_right': 'Right',
};
const render = (props: Partial<IGenericEditComponent> = {}) => {
  const allProps: IGenericEditComponent = {
    component: componentData,
    handleComponentChange: jest.fn(),
    ...props,
  };

  return renderWithMockStore()(<ImageComponent {...allProps} />);
};

// Mocks:
jest.mock(
  'react-i18next',
  () => ({ useTranslation: () => mockUseTranslation(texts) }),
);

describe('ImageComponent', () => {
  it('should call handleComponentUpdate callback with image src value for nb when image source input is changed', async () => {
    const handleUpdate = jest.fn();
    const imgSrc = 'placekitten.com/500/500';
    render({ handleComponentChange: handleUpdate });

    const srcInput = screen.getByRole('textbox', {
      name: /source/i,
    });

    await act(() => user.type(srcInput, imgSrc));

    expect(handleUpdate).toHaveBeenCalledWith({
      ...componentData,
      image: {
        ...componentData.image,
        src: {
          nb: imgSrc,
        },
      },
    });
  });

  it('should call handleComponentUpdate callback with image width value when image width input is changed', async () => {
    const handleUpdate = jest.fn();
    const size = '250px';
    render({ handleComponentChange: handleUpdate });

    const widthInput = screen.getByRole('textbox', {
      name: /width/i,
    });

    await act(() => user.type(widthInput, size));

    expect(handleUpdate).toHaveBeenCalledWith({
      ...componentData,
      image: {
        ...componentData.image,
        width: size,
      },
    });
  });

  it('should call handleComponentUpdate callback with alignment when placement select is changed', async () => {
    const handleUpdate = jest.fn();
    render({ handleComponentChange: handleUpdate });

    const placementInput = screen.getByRole('combobox', {
      name: /placement/i,
    });

    await act(() => user.type(placementInput, 'L')); // Type something to trigger showing Select options
    await act(() => user.click(screen.getByText('Left')));

    expect(handleUpdate).toHaveBeenCalledWith({
      ...componentData,
      image: {
        ...componentData.image,
        align: 'flex-start',
      },
    });
  });
});
