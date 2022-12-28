import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { IImageComponentProps } from './ImageComponent';
import { ImageComponent } from './ImageComponent';
import { appDataMock, renderWithMockStore } from '../../../../testing/mocks';
import { IAppDataState } from '../../../../features/appData/appDataReducers';

const user = userEvent.setup();

const componentData = {
  id: '4a66b4ea-13f1-4187-864a-fd4bb6e8cf88',
  textResourceBindings: {},
  type: 'Image',
  image: {
    src: {},
  },
};
const render = (props: Partial<IImageComponentProps> = {}) => {
  const allProps: IImageComponentProps = {
    component: componentData,
    language: {
      'ux_editor.modal_properties_image_src_value_label': 'Source',
      'ux_editor.modal_properties_image_placement_label': 'Placement',
      'ux_editor.modal_properties_image_alt_text_label': 'Alt text',
      'ux_editor.modal_properties_image_width_label': 'Width',
      'ux_editor.modal_properties_image_placement_left': 'Left',
      'ux_editor.modal_properties_image_placement_center': 'Center',
      'ux_editor.modal_properties_image_placement_right': 'Right',
    },
    handleComponentUpdate: jest.fn(),
    ...props,
  };

  const appData: IAppDataState = {
    ...appDataMock,
    textResources: {
      ...appDataMock.textResources,
      resources: {
        nb: [
          { id: 'altTextImg', value: 'Alternative text' },
          { id: 'altTextImg2', value: 'Alternative text 2' },
        ]
      }
    }
  }

  return renderWithMockStore({ appData })(<ImageComponent {...allProps} />);
};

describe('ImageComponent', () => {
  it('should call handleComponentUpdate callback with image src value for nb when image source input is changed', async () => {
    const handleUpdate = jest.fn();
    const imgSrc = 'placekitten.com/500/500';
    render({ handleComponentUpdate: handleUpdate });

    const srcInput = screen.getByRole('textbox', {
      name: /source/i,
    });

    await user.type(srcInput, imgSrc);

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
    render({ handleComponentUpdate: handleUpdate });

    const widthInput = screen.getByRole('textbox', {
      name: /width/i,
    });

    await user.type(widthInput, size);

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
    render({ handleComponentUpdate: handleUpdate });

    const placementInput = screen.getByRole('combobox', {
      name: /placement/i,
    });

    await user.type(placementInput, 'L'); // Type something to trigger showing Select options
    await user.click(screen.getByText('Left'));

    expect(handleUpdate).toHaveBeenCalledWith({
      ...componentData,
      image: {
        ...componentData.image,
        align: 'flex-start',
      },
    });
  });
});
