import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { IGenericEditComponent } from '../../componentConfig';
import { ImageComponent } from './ImageComponent';
import { renderWithProviders } from '../../../../testing/mocks';
import { ComponentType } from '@altinn/ux-editor/types/ComponentType';
import type { FormImageComponent } from '../../../../types/FormComponent';
import { textMock } from '@studio/testing/mocks/i18nMock';

const user = userEvent.setup();

const componentData: FormImageComponent = {
  id: '4a66b4ea-13f1-4187-864a-fd4bb6e8cf88',
  textResourceBindings: {},
  type: ComponentType.Image,
  image: {
    src: {},
    width: '100%',
    align: 'center',
  },
  dataModelBindings: {},
};

const render = async (props: Partial<IGenericEditComponent<ComponentType.Image>> = {}) => {
  const allProps: IGenericEditComponent<ComponentType.Image> = {
    component: componentData,
    handleComponentChange: jest.fn(),
    ...props,
  };

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
