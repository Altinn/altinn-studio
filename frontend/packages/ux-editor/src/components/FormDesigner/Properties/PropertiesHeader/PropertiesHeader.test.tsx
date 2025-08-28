import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { PropertiesHeader, type PropertiesHeaderProps } from './PropertiesHeader';
import userEvent from '@testing-library/user-event';
import { component1Mock } from '../../../../testing/layoutMock';
import { renderWithProviders } from '../../../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { componentSchemaMocks } from '../../../../testing/componentSchemaMocks';
import { layoutSet1NameMock, layoutSetsMock } from '@altinn/ux-editor/testing/layoutSetsMock';
import { layout1NameMock, layoutMock } from '@altinn/ux-editor/testing/layoutMock';
import type { IFormLayouts } from '@altinn/ux-editor/types/global';
import { app, org } from '@studio/testing/testids';
import { ComponentType } from 'app-shared/types/ComponentType';
import { componentMocks } from '@altinn/ux-editor/testing/componentMocks';

const mockHandleComponentUpdate = jest.fn();

const layoutSetName = layoutSet1NameMock;
const layouts: IFormLayouts = {
  [layout1NameMock]: layoutMock,
};

const defaultProps: PropertiesHeaderProps = {
  formItem: component1Mock,
  handleComponentUpdate: mockHandleComponentUpdate,
};

describe('PropertiesHeader', () => {
  afterEach(() => {
    jest.clearAllMocks();
    queryClientMock.clear();
  });

  it('renders the header name for the component', () => {
    renderPropertiesHeader();

    const heading = screen.getByRole('heading', {
      name: textMock(`ux_editor.component_title.${component1Mock.type}`),
      level: 2,
    });
    expect(heading).toBeInTheDocument();
  });

  it('displays the help text when the help text button is clicked', async () => {
    const user = userEvent.setup();
    renderPropertiesHeader();

    const helpTextButton = screen.getByRole('button', {
      name: textMock('ux_editor.component_help_text_general_title'),
    });

    await user.click(helpTextButton);

    expect(
      screen.getByRole('button', {
        name: textMock('ux_editor.component_help_text_general_title'),
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(textMock(`ux_editor.component_help_text.${component1Mock.type}`)),
    ).toBeInTheDocument();
  });

  it('should invoke "handleComponentUpdate" when id field blurs', async () => {
    const user = userEvent.setup();
    renderPropertiesHeader();

    const editComponentIdButton = screen.getByRole('button', {
      name: textMock('ux_editor.modal_properties_component_change_id'),
    });
    await user.click(editComponentIdButton);

    const inputField = screen.getByLabelText(
      textMock('ux_editor.modal_properties_component_change_id'),
    );
    await user.type(inputField, 'someNewId');
    fireEvent.blur(inputField);

    expect(mockHandleComponentUpdate).toHaveBeenCalledTimes(1);
  });

  it('should not invoke "handleComponentUpdateMock" when input field has error', async () => {
    const user = userEvent.setup();
    renderPropertiesHeader();

    const editComponentIdButton = screen.getByRole('button', {
      name: textMock('ux_editor.modal_properties_component_change_id'),
    });
    await user.click(editComponentIdButton);

    const containerIdInput = screen.getByLabelText(
      textMock('ux_editor.modal_properties_component_change_id'),
    );

    const invalidId = 'test@';
    await user.type(containerIdInput, invalidId);
    fireEvent.blur(containerIdInput);

    expect(screen.getByText(textMock('ux_editor.modal_properties_component_id_not_valid')));
    expect(containerIdInput).toHaveAttribute('aria-invalid', 'true');
    expect(mockHandleComponentUpdate).toHaveBeenCalledTimes(0);
  });

  it('should not render recommendedNextAction when component is subform and has layoutset ', () => {
    const subformLayoutSetId = 'subformLayoutSetId';
    renderPropertiesHeader({
      formItem: {
        ...component1Mock,
        type: ComponentType.Subform,
        layoutSet: layoutSetName,
        id: subformLayoutSetId,
      },
    });
    expect(subformLayoutSetId).toBe('subformLayoutSetId');
    expect(
      screen.queryByText(
        textMock('ux_editor.component_properties.subform.choose_layout_set_header'),
      ),
    ).not.toBeInTheDocument();
  });

  it('should render recommendedNextAction when component is subform and has no layoutset ', () => {
    renderPropertiesHeader({
      formItem: {
        ...component1Mock,
        type: ComponentType.Subform,
      },
    });
    expect(
      screen.getByText(textMock('ux_editor.component_properties.subform.choose_layout_set_header')),
    ).toBeInTheDocument();
  });

  it('should not render other accordions config when component type is subform and has no layoutset', () => {
    renderPropertiesHeader({
      formItem: {
        ...component1Mock,
        type: ComponentType.Subform,
      },
    });
    expect(screen.queryByText(textMock('right_menu.text'))).not.toBeInTheDocument();
    expect(screen.queryByText(textMock('right_menu.data_model_bindings'))).not.toBeInTheDocument();
    expect(screen.queryByText(textMock('right_menu.content'))).not.toBeInTheDocument();
  });

  it('should not render subform config when component is not subform', () => {
    renderPropertiesHeader();
    const setLayoutSetButton = screen.queryByRole('button', {
      name: textMock('ux_editor.component_properties.subform.selected_layout_set_label'),
    });
    expect(setLayoutSetButton).not.toBeInTheDocument();
  });

  it('should show warning when component is deprecated', () => {
    renderPropertiesHeader({ formItem: componentMocks[ComponentType.Summary] });
    const alert = screen.getByText(textMock('ux_editor.component_properties.deprecated.Summary'));
    expect(alert).toBeInTheDocument();
  });

  it('should not show warning when component is not deprecated', () => {
    renderPropertiesHeader({ formItem: componentMocks[ComponentType.Input] });
    const alert = screen.queryByText(textMock('ux_editor.component_properties.deprecated.Input'));
    expect(alert).not.toBeInTheDocument();
  });

  it('should render main configuration header', () => {
    renderPropertiesHeader({ formItem: componentMocks[ComponentType.Input] });

    const sectionHeader = textMock('ux_editor.component_properties.main_configuration');
    const headerMainConfig = screen.getByText(sectionHeader);
    expect(headerMainConfig).toBeInTheDocument();
  });

  it('should render main configuration for options for selection components', () => {
    renderPropertiesHeader({
      formItem: componentMocks[ComponentType.RadioButtons],
    });

    const sectionHeader = textMock('ux_editor.options.section_heading');
    const headerMainConfig = screen.getByText(sectionHeader);
    expect(headerMainConfig).toBeInTheDocument();
  });

  it('should not render main configuration for options for non-selection components', () => {
    renderPropertiesHeader({
      formItem: componentMocks[ComponentType.Input],
    });

    const sectionHeader = textMock('ux_editor.options.section_heading');
    const headerMainConfig = screen.queryByText(sectionHeader);
    expect(headerMainConfig).not.toBeInTheDocument();
  });
});

const renderPropertiesHeader = (props: Partial<PropertiesHeaderProps> = {}) => {
  const componentType = props.formItem ? props.formItem.type : defaultProps.formItem.type;

  queryClientMock.setQueryData(
    [QueryKey.FormComponent, componentType],
    componentSchemaMocks[componentType],
  );

  queryClientMock.setQueryData([QueryKey.FormLayouts, org, app, layoutSetName], layouts);
  queryClientMock.setQueryData([QueryKey.LayoutSets, org, app], layoutSetsMock);
  return renderWithProviders(<PropertiesHeader {...defaultProps} {...props} />);
};
