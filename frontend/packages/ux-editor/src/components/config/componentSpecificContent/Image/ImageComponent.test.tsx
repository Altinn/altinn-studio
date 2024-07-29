import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { IGenericEditComponent } from '../../componentConfig';
import { ImageComponent } from './ImageComponent';
import { renderHookWithProviders, renderWithProviders } from '../../../../testing/mocks';
import { useLayoutSchemaQuery } from '../../../../hooks/queries/useLayoutSchemaQuery';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormImageComponent } from '../../../../types/FormComponent';
import { textMock } from '@studio/testing/mocks/i18nMock';

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

const waitForData = async () => {
  const layoutSchemaResult = renderHookWithProviders(() => useLayoutSchemaQuery()).result;
  await waitFor(() => expect(layoutSchemaResult.current[0].isSuccess).toBe(true));
};

const render = async (props: Partial<IGenericEditComponent<ComponentType.Image>> = {}) => {
  const allProps: IGenericEditComponent<ComponentType.Image> = {
    component: componentData,
    handleComponentChange: jest.fn(),
    ...props,
  };

  await waitForData();

  return renderWithProviders(<ImageComponent {...allProps} />);
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

  it('should call handleComponentUpdate callback with alignment when placement select is changed', async () => {
    const handleUpdate = jest.fn();
    await render({ handleComponentChange: handleUpdate });

    const placementInput = screen.getByRole('combobox', {
      name: textMock('ux_editor.modal_properties_image_placement_label'),
    });

    await user.selectOptions(
      placementInput,
      textMock('ux_editor.modal_properties_image_placement_left'),
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
