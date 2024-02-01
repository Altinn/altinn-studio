import React from 'react';
import type { FormComponentConfigProps } from './FormComponentConfig';
import { FormComponentConfig } from './FormComponentConfig';
import { renderWithMockStore } from '../../testing/mocks';
import { componentMocks } from '../../testing/componentMocks';
import InputSchema from '../../testing/schemas/json/component/Input.schema.v1.json';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { screen, waitFor } from '@testing-library/react';
import { textMock } from '../../../../../testing/mocks/i18nMock';

describe('FormComponentConfig', () => {
  it('should render expected components', async () => {
    render({});
    expect(
      screen.getByText(textMock('ux_editor.modal_properties_component_change_id')),
    ).toBeInTheDocument();
    ['title', 'description', 'help'].forEach(async (key) => {
      expect(
        screen.getByText(textMock(`ux_editor.modal_properties_textResourceBindings_${key}`)),
      ).toBeInTheDocument();

      await waitFor(() => {
        expect(
          screen.getByText(textMock('ux_editor.modal_properties_data_model_link')),
        ).toBeInTheDocument();
      });

      [
        'grid',
        'readOnly',
        'required',
        'hidden',
        'renderAsSummary',
        'variant',
        'autocomplete',
        'maxLength',
        'triggers',
        'labelSettings',
        'pageBreak',
        'formatting',
      ].forEach(async (propertyKey) => {
        expect(
          await screen.findByText(textMock(`ux_editor.component_properties.${propertyKey}`)),
        ).toBeInTheDocument();
      });
    });
  });

  it('should render list of unsupported properties', () => {
    render({
      props: {
        hideUnsupported: false,
        schema: {
          ...InputSchema,
          properties: {
            ...InputSchema.properties,
            unsupportedProperty: {
              type: 'array',
              items: {
                type: 'object',
              },
            },
          },
        },
      },
    });
    expect(
      screen.getByText(textMock('ux_editor.edit_component.unsupported_properties_message')),
    ).toBeInTheDocument();
    expect(screen.getByText('unsupportedProperty')).toBeInTheDocument();
  });

  it('should show children property in list of unsupported properties if it is present', () => {
    render({
      props: {
        hideUnsupported: false,
        schema: {
          ...InputSchema,
          properties: {
            ...InputSchema.properties,
            children: {
              type: 'string',
            },
          },
        },
      },
    });
    expect(
      screen.getByText(textMock('ux_editor.edit_component.unsupported_properties_message')),
    ).toBeInTheDocument();
    expect(screen.getByText('children')).toBeInTheDocument();
  });

  it('should not render list of unsupported properties if hideUnsupported is true', () => {
    render({
      props: {
        hideUnsupported: true,
        schema: {
          ...InputSchema,
          properties: {
            ...InputSchema.properties,
            unsupportedProperty: {
              type: 'array',
              items: {
                type: 'object',
              },
            },
          },
        },
      },
    });
    expect(
      screen.queryByText(textMock('ux_editor.edit_component.unsupported_properties_message')),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('unsupportedProperty')).not.toBeInTheDocument();
  });

  it('should not render property if it is null', () => {
    render({
      props: {
        hideUnsupported: true,
        schema: {
          ...InputSchema,
          properties: {
            ...InputSchema.properties,
            nullProperty: null,
          },
        },
      },
    });
    expect(screen.queryByText('nullProperty')).not.toBeInTheDocument();
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
