import React from 'react';
import type { FormComponentConfigProps } from './FormComponentConfig';
import { FormComponentConfig } from './FormComponentConfig';
import { renderWithProviders } from '../../testing/mocks';
import { componentMocks } from '../../testing/componentMocks';
import InputSchema from '../../testing/schemas/json/component/Input.schema.v1.json';
import DatepickerSchema from '../../testing/schemas/json/component/Datepicker.schema.v1.json';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { ComponentType } from 'app-shared/types/ComponentType';

describe('FormComponentConfig', () => {
  it('should render nothing when schema is undefined, has no properties, or has undefined properties', () => {
    const schemaConfigs = [
      { schema: undefined },
      { schema: { properties: undefined } },
      { schema: { properties: {} } },
    ];

    schemaConfigs.forEach((props) => {
      renderFormComponentConfig({ props });
      const properties = ['grid', 'readOnly', 'required', 'hidden'];
      properties.forEach((property) => {
        expect(
          screen.queryByText(textMock(`ux_editor.component_properties.${property}`)),
        ).not.toBeInTheDocument();
      });
      expect(
        screen.queryByText('ux_editor.component_propertiesDescription.somePropertyName'),
      ).not.toBeInTheDocument();
      expect(screen.queryByText('Some description')).not.toBeInTheDocument();
    });
  });

  it('should render expected default components', async () => {
    renderFormComponentConfig({});
    const properties = ['readOnly', 'required', 'hidden'];
    for (const property of properties) {
      expect(
        await screen.findByText(textMock(`ux_editor.component_properties.${property}`)),
      ).toBeInTheDocument();
    }
  });

  it('should render the hide-button after clikcing on show-button', async () => {
    const user = userEvent.setup();
    renderFormComponentConfig({});
    const button = screen.getByRole('button', {
      name: textMock('ux_editor.component_other_properties_show_many_settings'),
    });
    expect(button).toBeInTheDocument();
    await user.click(button);
    expect(
      screen.getByRole('button', {
        name: textMock('ux_editor.component_other_properties_hide_many_settings'),
      }),
    ).toBeInTheDocument();
  });

  it('Should render the rest of the components when show-button is clicked and show hide-button', async () => {
    const user = userEvent.setup();
    renderFormComponentConfig({});
    const button = screen.getByRole('button', {
      name: textMock('ux_editor.component_other_properties_show_many_settings'),
    });
    expect(button).toBeInTheDocument();
    await user.click(button);
    const properties = [
      'renderAsSummary',
      'variant',
      'autocomplete',
      'maxLength',
      'pageBreak',
      'formatting',
    ];
    for (const property of properties) {
      expect(
        await screen.findByText(textMock(`ux_editor.component_properties.${property}`)),
      ).toBeInTheDocument();
    }

    const hideButton = screen.getByRole('button', {
      name: textMock('ux_editor.component_other_properties_hide_many_settings'),
    });
    expect(hideButton).toBeInTheDocument();
  });

  it('should render "RedirectToLayoutSet"', () => {
    renderFormComponentConfig({
      props: {
        component: {
          id: 'subform-unit-test-id',
          layoutSet: 'subform-unit-test-layout-set',
          itemType: 'COMPONENT',
          type: ComponentType.Subform,
        },
        schema: {
          properties: {
            layoutSet: { value: 'subform-unit-test-layout-set' },
          },
        },
      },
    });

    expect(screen.getByText(textMock('ux_editor.component_properties.subform.go_to_layout_set')));
  });

  it('should render list of unsupported properties', () => {
    renderFormComponentConfig({
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

  it('should not render list of unsupported properties if hideUnsupported is true', () => {
    renderFormComponentConfig({
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

  it('should render property text for the "sortOrder" property', async () => {
    const user = userEvent.setup();
    renderFormComponentConfig({
      props: {
        schema: {
          ...InputSchema,
          properties: {
            ...InputSchema.properties,
            sortOrder: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['option1', 'option2'],
              },
            },
          },
        },
      },
    });
    await user.click(screen.getByText(textMock('ux_editor.component_properties.sortOrder')));
    expect(
      screen.getByRole('combobox', {
        name: textMock('ux_editor.component_properties.sortOrder'),
      }),
    ).toBeInTheDocument();
  });

  it('should render property text for the "showValidations" property', () => {
    renderFormComponentConfig({
      props: {
        schema: {
          ...InputSchema,
          properties: {
            ...InputSchema.properties,
            showValidations: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['true', 'false'],
              },
            },
            anotherProperty: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['option1', 'option2'],
              },
            },
          },
        },
      },
    });
    expect(
      screen.getByText(textMock('ux_editor.component_properties.showValidations')),
    ).toBeInTheDocument();
  });

  it('should not render property if it is null', () => {
    renderFormComponentConfig({
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

  it('should call updateComponent with false value when checking a default true property switch', async () => {
    const user = userEvent.setup();
    const handleComponentUpdateMock = jest.fn();
    renderFormComponentConfig({
      props: {
        schema: DatepickerSchema,
        handleComponentUpdate: handleComponentUpdateMock,
      },
    });
    const button = screen.getByRole('button', {
      name: textMock('ux_editor.component_other_properties_show_many_settings'),
    });
    expect(button).toBeInTheDocument();
    await user.click(button);
    const timeStampSwitch = screen.getByRole('checkbox', {
      name: textMock('ux_editor.component_properties.timeStamp'),
    });
    await user.click(timeStampSwitch);
    expect(handleComponentUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ timeStamp: false }),
    );
  });

  const renderFormComponentConfig = ({
    props = {},
  }: {
    props?: Partial<FormComponentConfigProps>;
  }) => {
    const { Input: inputComponent } = componentMocks;
    const defaultProps: FormComponentConfigProps = {
      schema: InputSchema,
      editFormId: '',
      component: inputComponent,
      handleComponentUpdate: jest.fn(),
      hideUnsupported: false,
    };
    return renderWithProviders(<FormComponentConfig {...defaultProps} {...props} />);
  };
});
