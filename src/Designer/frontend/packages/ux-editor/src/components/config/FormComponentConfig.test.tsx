import type { FormComponentConfigProps } from './FormComponentConfig';
import { FormComponentConfig } from './FormComponentConfig';
import { renderWithProviders } from '../../testing/mocks';
import { componentMocks } from '../../testing/componentMocks';
import { componentCatalog } from '@app/layout-contract';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { ComponentType } from '@altinn/ux-editor/types/ComponentType';

describe('FormComponentConfig', () => {
  it('should render nothing when there are no properties', () => {
    renderFormComponentConfig({ properties: {} });
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

  it('should render expected default components', async () => {
    renderFormComponentConfig();
    const properties = ['readOnly', 'required', 'hidden'];
    for (const property of properties) {
      expect(
        await screen.findByText(textMock(`ux_editor.component_properties.${property}`)),
      ).toBeInTheDocument();
    }
  });

  it('should render the hide-button after clikcing on show-button', async () => {
    const user = userEvent.setup();
    renderFormComponentConfig();
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
    renderFormComponentConfig();
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
      component: {
        id: 'subform-unit-test-id',
        layoutSet: 'subform-unit-test-layout-set',
        tableColumns: [],
        type: ComponentType.Subform,
      },
      properties: {
        layoutSet: { type: 'string', required: false },
      },
    });

    expect(screen.getByText(textMock('ux_editor.component_properties.subform.go_to_layout_set')));
  });

  it('should render property text for the "sortOrder" property', async () => {
    const user = userEvent.setup();
    renderFormComponentConfig({
      properties: {
        ...componentCatalog.Input.properties,
        sortOrder: {
          type: 'array',
          items: { type: 'string', allowedValues: ['option1', 'option2'] },
          required: false,
        },
      },
    });
    await user.click(screen.getByText(textMock('ux_editor.component_properties.sortOrder')));
    expect(
      screen.getByLabelText(textMock('ux_editor.component_properties.sortOrder')),
    ).toBeInTheDocument();
  });

  it('should render property text for the "showValidations" property', () => {
    renderFormComponentConfig({
      properties: {
        ...componentCatalog.Input.properties,
        showValidations: {
          type: 'array',
          items: { type: 'string', allowedValues: ['true', 'false'] },
          required: false,
        },
        anotherProperty: {
          type: 'array',
          items: { type: 'string', allowedValues: ['option1', 'option2'] },
          required: false,
        },
      },
    });
    expect(
      screen.getByText(textMock('ux_editor.component_properties.showValidations')),
    ).toBeInTheDocument();
  });

  it('should not render an unsupported property type', () => {
    renderFormComponentConfig({
      properties: {
        ...componentCatalog.Input.properties,
        unsupportedProperty: { type: 'any', required: false },
      },
    });
    expect(screen.queryByText('unsupportedProperty')).not.toBeInTheDocument();
  });

  it('should call updateComponent with true value when checking a default false property switch', async () => {
    const user = userEvent.setup();
    const handleComponentUpdateMock = jest.fn();
    renderFormComponentConfig({
      properties: componentCatalog.Datepicker.properties,
      handleComponentUpdate: handleComponentUpdateMock,
    });
    const button = screen.getByRole('button', {
      name: textMock('ux_editor.component_other_properties_show_many_settings'),
    });
    expect(button).toBeInTheDocument();
    await user.click(button);
    const timeStampSwitch = screen.getByRole('switch', {
      name: textMock('ux_editor.component_properties.timeStamp'),
    });
    await user.click(timeStampSwitch);
    expect(handleComponentUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ timeStamp: true }),
    );
  });

  it('should not render value property for Text component', () => {
    const { Text: textComponent } = componentMocks;
    renderFormComponentConfig({
      component: textComponent,
      properties: {
        value: { type: 'string', required: true },
      },
    });
    expect(screen.queryByText('ux_editor.component_properties.value')).not.toBeInTheDocument();
  });

  it('renders declared language sources for Video', async () => {
    const user = userEvent.setup();
    renderFormComponentConfig({
      component: {
        id: 'video',
        type: ComponentType.Video,
        video: { src: {} },
      },
      properties: componentCatalog.Video.properties,
    });

    await user.click(screen.getByText(textMock('ux_editor.component_properties.video')));
    await user.click(screen.getByText(textMock('ux_editor.component_properties.src')));

    expect(screen.getByText(textMock('ux_editor.component_properties.nb'))).toBeInTheDocument();
    expect(screen.getByText(textMock('ux_editor.component_properties.nn'))).toBeInTheDocument();
    expect(screen.getByText(textMock('ux_editor.component_properties.en'))).toBeInTheDocument();
  });

  it('keeps generic Image settings while leaving its source to the image library editor', async () => {
    const user = userEvent.setup();
    renderFormComponentConfig({
      component: {
        id: 'image',
        type: ComponentType.Image,
        image: { src: {} },
      },
      properties: componentCatalog.Image.properties,
    });

    await user.click(screen.getByText(textMock('ux_editor.component_properties.image')));

    expect(screen.getByText(textMock('ux_editor.component_properties.width'))).toBeInTheDocument();
    expect(screen.getByText(textMock('ux_editor.component_properties.align'))).toBeInTheDocument();
    expect(
      screen.queryByText(textMock('ux_editor.component_properties.src')),
    ).not.toBeInTheDocument();
  });

  const renderFormComponentConfig = (props: Partial<FormComponentConfigProps> = {}) => {
    const { Input: inputComponent } = componentMocks;
    const defaultProps: FormComponentConfigProps = {
      properties: componentCatalog.Input.properties,
      editFormId: '',
      component: inputComponent,
      handleComponentUpdate: jest.fn(),
    };
    return renderWithProviders(<FormComponentConfig {...defaultProps} {...props} />);
  };
});
