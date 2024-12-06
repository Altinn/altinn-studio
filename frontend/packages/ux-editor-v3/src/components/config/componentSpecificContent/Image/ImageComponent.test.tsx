import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { IGenericEditComponent } from '../../componentConfig';
import { ImageComponent } from './ImageComponent';
import { renderHookWithMockStore, renderWithMockStore } from '../../../../testing/mocks';
import { useLayoutSchemaQuery } from '../../../../hooks/queries/useLayoutSchemaQuery';
import { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { FormImageComponent } from '../../../../types/FormComponent';

const user = userEvent.setup();

const componentData: FormImageComponent = {
  id: '4a66b4ea-13f1-4187-864a-fd4bb6e8cf88',
  textResourceBindings: {},
  type: ComponentTypeV3.Image,
  image: {
    src: {},
  },
  itemType: 'COMPONENT',
  dataModelBindings: {},
};

const waitForData = async () => {
  const layoutSchemaResult = renderHookWithMockStore()(() => useLayoutSchemaQuery())
    .renderHookResult.result;
  await waitFor(() => expect(layoutSchemaResult.current[0].isSuccess).toBe(true));
};

const render = async (props: Partial<IGenericEditComponent> = {}) => {
  const allProps: IGenericEditComponent = {
    component: componentData,
    handleComponentChange: jest.fn(),
    ...props,
  };

  await waitForData();

  return renderWithMockStore()(<ImageComponent {...allProps} />);
};

describe('ImageComponent', () => {
  it('should call handleComponentUpdate callback with image src value for nb when image source input is changed', async () => {
    const handleUpdate = jest.fn();
    const imgSrc = 'placekitten.com/500/500';
    await render({ handleComponentChange: handleUpdate });

    const srcInput = screen.getByRole('textbox', {
      name: textMock('ux_editor.modal_properties_image_src_value_label'),
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
    await render({ handleComponentChange: handleUpdate });

    const widthInput = screen.getByRole('textbox', {
      name: textMock('ux_editor.modal_properties_image_width_label'),
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
    await render({ handleComponentChange: handleUpdate });

    const placementInput = screen.getByRole('combobox', {
      name: /placement/i,
    });

    await user.type(placementInput, 'L'); // Type something to trigger showing Select options
    await user.selectOptions(
      placementInput,
      screen.getByText(textMock('ux_editor.modal_properties_image_placement_left')),
    );

    expect(handleUpdate).toHaveBeenCalledWith({
      ...componentData,
      image: {
        ...componentData.image,
        align: 'flex-start',
      },
    });
  });
});
