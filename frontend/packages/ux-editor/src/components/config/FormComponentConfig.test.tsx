import React from 'react';
import {
  FormComponentConfig,
  FormComponentConfigProps,
} from './FormComponentConfig';
import { renderWithMockStore } from '../../testing/mocks';
import { componentMocks } from '../../testing/componentMocks';
import InputSchema from '../../testing/schemas/json/component/Input.schema.v1.json';
import { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { screen } from '@testing-library/react';
import { textMock } from '../../../../../testing/mocks/i18nMock';

describe('FormComponentConfig', () => {
  it('should render expected components', async () => {
    render({});
    expect(
      screen.getByText(textMock('ux_editor.modal_properties_component_change_id'))
    ).toBeInTheDocument();
    ['title', 'description', 'help'].forEach((key) => {
      expect(
        screen.getByText(textMock(`ux_editor.modal_properties_textResourceBindings_${key}`))
      ).toBeInTheDocument();

      expect(
        screen.getByText(textMock('ux_editor.modal_properties_data_model_helper'))
      ).toBeInTheDocument();

      [
        'readOnly',
        'required',
        'hidden',
        'renderAsSummary',
        'variant',
        'autocomplete',
        'maxLength',
        'triggers',
      ].forEach(async (propertyKey) => {
        expect(
          await screen.findByText(textMock(`ux_editor.component_properties.${propertyKey}`))
        ).toBeInTheDocument();
      });
    });
  });

  const render = ({
    props = {},
    queries = {},
  }: {
    props?: Partial<FormComponentConfigProps>;
    queries?: Partial<ServicesContextProps>;
  }) => {
    const { Input: inputComponent } = componentMocks;
    const defaultProps: FormComponentConfigProps = {
      schema: InputSchema,
      editFormId: '',
      component: inputComponent,
      handleComponentUpdate: jest.fn(),
      hideUnsupported: false,
    };
    return renderWithMockStore({}, queries)(<FormComponentConfig {...defaultProps} {...props} />);
  };
});
