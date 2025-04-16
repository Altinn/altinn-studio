import React from 'react';
import type { FormComponentConfigProps } from './FormComponentConfig';
import { FormComponentConfig } from './FormComponentConfig';
import { renderWithProviders } from '../../testing/mocks';
import { componentMocks } from '../../testing/componentMocks';
import InputSchema from '../../testing/schemas/json/component/Input.schema.v1.json';
import DatepickerSchema from '../../testing/schemas/json/component/Datepicker.schema.v1.json';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { screen, waitFor } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import userEvent from '@testing-library/user-event';
import { ComponentType } from 'app-shared/types/ComponentType';

const somePropertyName = 'somePropertyName';
const customTextMockToHandleUndefined = (
  keys: string | string[],
  variables?: KeyValuePairs<string>,
) => {
  const key = Array.isArray(keys) ? keys[0] : keys;
  if (key === `ux_editor.component_properties_description.${somePropertyName}`) return key;
  return variables
    ? '[mockedText(' + key + ', ' + JSON.stringify(variables) + ')]'
    : '[mockedText(' + key + ')]';
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: customTextMockToHandleUndefined,
  }),
}));

describe('FormComponentConfig', () => {
  it('should render expected default components', async () => {
    render({});
    const properties = ['readOnly', 'required', 'hidden'];
    for (const property of properties) {
      expect(
        await screen.findByText(textMock(`ux_editor.component_properties.${property}`)),
      ).toBeInTheDocument();
    }
  });

  it('should render the show-button', async () => {
    render({});
    const button = screen.getByRole('button', {
      name: textMock('ux_editor.component_other_properties_show_many_settings'),
    });
    expect(button).toBeInTheDocument();
  });

  it('should render the hide-button after clikcing on show-button', async () => {
    const user = userEvent.setup();
    render({});
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
    render({});
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
    expect(
      await screen.findByText(textMock('ux_editor.component_properties.optionalIndicator')),
    ).toBeInTheDocument();
    const hideButton = screen.getByRole('button', {
      name: textMock('ux_editor.component_other_properties_hide_many_settings'),
    });
    expect(hideButton).toBeInTheDocument();
  });

  it('should render "RedirectToLayoutSet"', () => {
    render({
      props: {
        component: {
          id: 'subform-unit-test-id',
          layoutSet: 'subform-unit-test-layout-set',
          itemType: 'COMPONENT',
          type: ComponentType.Subform,
        },
        schema: {
          properties: {
            layoutSet: 'subform-unit-test-layout-set',
          },
        },
      },
    });

    expect(screen.getByText(textMock('ux_editor.component_properties.subform.go_to_layout_set')));
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

  it('should render property text for the "sortOrder" property', async () => {
    const user = userEvent.setup();
    render({
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
    render({
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

  it('should render property text for "preselectedOptionIndex" and EditNumberValue for other properties', () => {
    render({
      props: {
        schema: {
          ...InputSchema,
          properties: {
            ...InputSchema.properties,
            preselectedOptionIndex: {
              type: 'number',
              enum: [0, 1, 2],
            },
            anotherNumberProperty: {
              type: 'number',
              description: 'A sample number property',
            },
          },
        },
      },
    });
    expect(
      screen.getByText(textMock('ux_editor.component_properties.preselectedOptionIndex_button')),
    ).toBeInTheDocument();
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

  it('should render nothing if schema is undefined', () => {
    render({
      props: {
        schema: undefined,
      },
    });
    expect(
      screen.queryByText(textMock('ux_editor.component_properties.grid')),
    ).not.toBeInTheDocument();
  });

  it('should render nothing if schema properties are undefined', () => {
    render({
      props: {
        schema: {
          properties: undefined,
        },
      },
    });
    expect(
      screen.queryByText(textMock('ux_editor.component_properties.grid')),
    ).not.toBeInTheDocument();
  });

  it('should call handleComponentUpdate and setSelectedValue when array property is updated', async () => {
    const user = userEvent.setup();
    const handleComponentUpdateMock = jest.fn();
    const propertyKey = 'supportedArrayProperty';
    renderWithProviders(
      <FormComponentConfig
        schema={{
          properties: {
            [propertyKey]: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['option1', 'option2'],
              },
            },
          },
        }}
        editFormId=''
        component={componentMocks.Input}
        handleComponentUpdate={handleComponentUpdateMock}
        hideUnsupported={false}
      />,
    );
    const arrayPropertyButton = screen.getByRole('button', {
      name: textMock(`ux_editor.component_properties.${propertyKey}`),
    });
    await user.click(arrayPropertyButton);
    const combobox = screen.getByRole('combobox', {
      name: textMock(`ux_editor.component_properties.${propertyKey}`),
    });
    await user.click(combobox);

    const option1 = screen.getByRole('option', {
      name: textMock('ux_editor.component_properties.enum_option1'),
    });
    await user.click(option1);

    await waitFor(() => {
      expect(handleComponentUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          [propertyKey]: ['option1'],
        }),
      );
    });

    const selectedValueDisplay = screen.getByRole('option', {
      name: textMock('ux_editor.component_properties.enum_option1'),
    });
    expect(selectedValueDisplay).toBeInTheDocument();
  });

  it('should render default boolean values if defined', async () => {
    const user = userEvent.setup();
    render({
      props: {
        schema: DatepickerSchema,
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
    expect(timeStampSwitch).toBeChecked();
  });

  it('should call updateComponent with false value when checking a default true property switch', async () => {
    const user = userEvent.setup();
    const handleComponentUpdateMock = jest.fn();
    //const { component: datePickerComponent } = componentMocks;
    render({
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

  it('should show description from schema for objects if key is not defined', async () => {
    const user = userEvent.setup();
    const descriptionFromSchema = 'Some description for some object property';
    render({
      props: {
        schema: {
          ...InputSchema,
          properties: {
            ...InputSchema.properties,
            somePropertyName: {
              type: 'object',
              properties: {},
              description: descriptionFromSchema,
            },
          },
        },
      },
    });
    await user.click(
      screen.getByRole('button', {
        name: textMock('ux_editor.component_properties.somePropertyName'),
      }),
    );
    expect(screen.getByText(descriptionFromSchema)).toBeInTheDocument();
  });

  it('should not render property if it is unsupported', () => {
    render({
      props: {
        schema: {
          ...InputSchema,
          properties: {
            ...InputSchema.properties,
            unsupportedProperty: {
              type: 'object',
              properties: {},
              additionalProperties: {
                type: 'string',
              },
            },
          },
        },
      },
    });
    expect(
      screen.queryByText(textMock(`ux_editor.component_properties.unsupportedProperty`)),
    ).not.toBeInTheDocument();
  });

  it('should only render array properties with items of type string AND enum values', async () => {
    const user = userEvent.setup();
    render({
      props: {
        schema: {
          ...InputSchema,
          properties: {
            ...InputSchema.properties,
            supportedArrayProperty: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['option1', 'option2'],
              },
            },
            unsupportedArrayProperty: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
          },
        },
      },
    });
    await user.click(
      screen.getByText(textMock('ux_editor.component_properties.supportedArrayProperty')),
    );
    expect(
      screen.getByRole('combobox', {
        name: textMock('ux_editor.component_properties.supportedArrayProperty'),
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText(textMock('ux_editor.component_properties.unsupportedArrayProperty')),
    ).not.toBeInTheDocument();
  });

  it('should call handleComponentUpdate with validFileEndings undefined when hasCustomFileEndings is false', async () => {
    const handleComponentUpdateMock = jest.fn();
    render({
      props: {
        schema: {
          properties: {
            hasCustomFileEndings: { type: 'boolean', default: true },
            validFileEndings: { type: 'string', description: 'Valid file endings' },
          },
        },
        handleComponentUpdate: handleComponentUpdateMock,
      },
    });
    const user = userEvent.setup();
    const hasCustomFileEndingsSwitch = screen.getByRole('checkbox', {
      name: textMock('ux_editor.component_properties.hasCustomFileEndings'),
    });
    expect(hasCustomFileEndingsSwitch).toBeChecked();
    await user.click(hasCustomFileEndingsSwitch);
    expect(handleComponentUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        hasCustomFileEndings: false,
        validFileEndings: undefined,
      }),
    );
  });

  it('should render array properties with enum values correctly', async () => {
    const user = userEvent.setup();
    const propertyKey = 'supportedArrayProperty';
    const enumValues = ['option1', 'option2'];
    render({
      props: {
        schema: {
          properties: {
            [propertyKey]: {
              type: 'array',
              items: {
                type: 'string',
                enum: enumValues,
              },
            },
          },
        },
        component: {
          ...componentMocks.Input,
          [propertyKey]: enumValues,
        },
      },
    });
    const arrayPropertyButton = screen.getByRole('button', {
      name: textMock(`ux_editor.component_properties.${propertyKey}`),
    });
    await user.click(arrayPropertyButton);
    for (const dataType of enumValues) {
      expect(
        screen.getByText(textMock(`ux_editor.component_properties.enum_${dataType}`)),
      ).toBeInTheDocument();
    }
  });

  it('should call handleComponentUpdate with updated component when hasCustomFileEndings is true', async () => {
    const handleComponentUpdateMock = jest.fn();
    render({
      props: {
        schema: {
          properties: {
            hasCustomFileEndings: { type: 'boolean', default: false },
            validFileEndings: { type: 'string', description: 'Valid file endings' },
          },
        },
        handleComponentUpdate: handleComponentUpdateMock,
      },
    });
    const user = userEvent.setup();
    const hasCustomFileEndingsSwitch = screen.getByRole('checkbox', {
      name: textMock('ux_editor.component_properties.hasCustomFileEndings'),
    });
    expect(hasCustomFileEndingsSwitch).not.toBeChecked();
    await user.click(hasCustomFileEndingsSwitch);
    expect(handleComponentUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        hasCustomFileEndings: true,
      }),
    );
  });

  it('should call handleComponentUpdate when a boolean value is toggled', async () => {
    const user = userEvent.setup();
    const handleComponentUpdateMock = jest.fn();
    render({
      props: {
        schema: DatepickerSchema,
        handleComponentUpdate: handleComponentUpdateMock,
      },
    });
    const timeStampSwitch = screen.getByRole('checkbox', {
      name: textMock('ux_editor.component_properties.readOnly'),
    });
    await user.click(timeStampSwitch);
    expect(handleComponentUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ readOnly: true }),
    );
  });

  it('should toggle close button and grid width text when the open and close buttons are clicked', async () => {
    const user = userEvent.setup();
    render({
      props: {
        schema: InputSchema,
      },
    });
    const openGridButton = screen.getByRole('button', {
      name: textMock('ux_editor.component_properties.grid'),
    });
    await user.click(openGridButton);
    expect(screen.getByText(textMock('ux_editor.component_properties.grid'))).toBeInTheDocument();
    const widthText = screen.getByText(textMock('ux_editor.modal_properties_grid'));
    expect(widthText).toBeInTheDocument();

    const closeGridButton = screen.getByRole('button', {
      name: textMock('general.close'),
    });
    await user.click(closeGridButton);
    expect(closeGridButton).not.toBeInTheDocument();
    expect(widthText).not.toBeInTheDocument();
  });

  it('should not render grid width text if grid button is not clicked', async () => {
    const user = userEvent.setup();
    render({
      props: {
        schema: InputSchema,
      },
    });
    expect(screen.queryByText(textMock('ux_editor.modal_properties_grid'))).not.toBeInTheDocument();
    const openGridButton = screen.getByRole('button', {
      name: textMock('ux_editor.component_properties.grid'),
    });
    await user.click(openGridButton);
    expect(screen.getByText(textMock('ux_editor.component_properties.grid'))).toBeInTheDocument();

    const widthText = screen.getByText(textMock('ux_editor.modal_properties_grid'));
    expect(widthText).toBeInTheDocument();

    const closeGridButton = screen.getByRole('button', {
      name: textMock('general.close'),
    });
    await user.click(closeGridButton);
    expect(closeGridButton).not.toBeInTheDocument();
    expect(widthText).not.toBeInTheDocument();
  });

  it('should call handleComponentUpdate when optionalIndicator in labelSettings is toggled', async () => {
    const user = userEvent.setup();
    const handleComponentUpdateMock = jest.fn();
    render({
      props: {
        schema: {
          ...InputSchema,
          properties: {
            ...InputSchema.properties,
            labelSettings: {
              type: 'object',
              properties: {
                optionalIndicator: {
                  type: 'boolean',
                  default: true,
                },
              },
            },
          },
        },
        component: {
          ...componentMocks.Input,
          labelSettings: {
            optionalIndicator: true,
          },
        },
        handleComponentUpdate: handleComponentUpdateMock,
      },
    });

    const showMoreButton = screen.getByRole('button', {
      name: textMock('ux_editor.component_other_properties_show_many_settings'),
    });
    await user.click(showMoreButton);
    const optionalIndicatorSwitch = screen.getByRole('checkbox', {
      name: textMock('ux_editor.component_properties.optionalIndicator'),
    });
    expect(optionalIndicatorSwitch).toBeChecked();
    await user.click(optionalIndicatorSwitch);
    await waitFor(() => {
      expect(handleComponentUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          labelSettings: expect.objectContaining({
            optionalIndicator: false,
          }),
        }),
      );
    });
  });

  it('should toggle object card when object property button is clicked', async () => {
    const user = userEvent.setup();
    const propertyKey = 'someObjectProperty';
    render({
      props: {
        schema: {
          ...InputSchema,
          properties: {
            ...InputSchema.properties,
            [propertyKey]: {
              type: 'object',
              properties: {
                someField: { type: 'string' },
              },
            },
          },
        },
        component: {
          ...componentMocks.Input,
          [propertyKey]: {},
        },
      },
    });
    const objectButton = screen.getByRole('button', {
      name: textMock(`ux_editor.component_properties.${propertyKey}`),
    });
    expect(objectButton).toBeInTheDocument();
    expect(
      screen.queryByText(textMock(`ux_editor.component_properties.${propertyKey}`), {
        selector: 'h3',
      }),
    ).not.toBeInTheDocument();
    await user.click(objectButton);
    const cardHeader = await screen.findByText(
      textMock(`ux_editor.component_properties.${propertyKey}`),
      { selector: 'h3' },
    );
    expect(cardHeader).toBeInTheDocument();
    expect(screen.getByRole('button', { name: textMock('general.close') })).toBeInTheDocument();
    const closeButton = screen.getByRole('button', { name: textMock('general.close') });
    await user.click(closeButton);
    expect(
      screen.queryByText(textMock(`ux_editor.component_properties.${propertyKey}`), {
        selector: 'h3',
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: textMock(`ux_editor.component_properties.${propertyKey}`),
      }),
    ).toBeInTheDocument();
  });

  it('should call toggleObjectCard when property button is clicked', async () => {
    const user = userEvent.setup();
    const propertyKey = 'testObjectProperty';
    render({
      props: {
        schema: {
          properties: {
            [propertyKey]: {
              type: 'object',
              properties: {
                testField: { type: 'string' },
              },
            },
          },
        },
        component: {
          ...componentMocks.Input,
          [propertyKey]: { testField: 'initial' },
        },
      },
    });
    const toggleButton = screen.getByRole('button', {
      name: textMock(`ux_editor.component_properties.${propertyKey}`),
    });
    await user.click(toggleButton);
    expect(screen.getByRole('button', { name: textMock('general.close') })).toBeInTheDocument();
  });

  it('should handle toggle when property is undefined', async () => {
    const user = userEvent.setup();
    const propertyKey = 'undefinedProperty';
    render({
      props: {
        schema: {
          properties: {
            [propertyKey]: {
              type: 'object',
              properties: {},
            },
          },
        },
        component: {
          ...componentMocks.Input,
        },
      },
    });
    const toggleButton = screen.getByRole('button', {
      name: textMock(`ux_editor.component_properties.${propertyKey}`),
    });
    await user.click(toggleButton);
    expect(screen.getByRole('button', { name: textMock('general.close') })).toBeInTheDocument();
  });

  it('should toggle object property card when clicked', async () => {
    const user = userEvent.setup();
    const propertyKey = 'grid';
    render({
      props: {
        schema: InputSchema,
        component: {
          ...componentMocks.Input,
          [propertyKey]: {},
        },
      },
    });
    const openButton = await screen.findByRole('button', {
      name: textMock(`ux_editor.component_properties.${propertyKey}`),
    });
    await user.click(openButton);
    const closeButton = await screen.findByRole('button', {
      name: textMock('general.close'),
    });
    expect(closeButton).toBeInTheDocument();
    await user.click(closeButton);
    await waitFor(() => {
      expect(
        screen.queryByRole('button', {
          name: textMock('general.close'),
        }),
      ).not.toBeInTheDocument();
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
    return renderWithProviders(<FormComponentConfig {...defaultProps} {...props} />, { queries });
  };
});
