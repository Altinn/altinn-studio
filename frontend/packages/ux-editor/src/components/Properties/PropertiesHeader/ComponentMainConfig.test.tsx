import React from 'react';
import type { FormItem } from '@altinn/ux-editor/types/FormItem';
import { ComponentType } from 'app-shared/types/ComponentType';
import { screen } from '@testing-library/react';
import { ComponentMainConfig } from './ComponentMainConfig';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { component1Mock } from '@altinn/ux-editor/testing/layoutMock';
import { renderWithProviders } from '../../../testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import { layoutSetsExtendedMock } from '@altinn/ux-editor/testing/layoutSetsMock';

const mainConfigComponentMock = (type: ComponentType) =>
  ({
    id: '0',
    type,
    itemType: 'COMPONENT',
    target: {},
  }) as FormItem;

describe('ComponentMainConfig', () => {
  afterEach(() => jest.clearAllMocks);

  it('should render summary2 config when the component type matches', async () => {
    renderComponentMainConfig(mainConfigComponentMock(ComponentType.Summary2));
    const targetHeader = screen.getByText(textMock('ux_editor.component_properties.target'));
    expect(targetHeader).toBeInTheDocument();
  });

  it('should render subform config when the component type matches', async () => {
    renderComponentMainConfig(mainConfigComponentMock(ComponentType.Subform));
    const subformHeader = screen.getByText(
      textMock('ux_editor.properties_panel.subform_table_columns.heading'),
    );
    expect(subformHeader).toBeInTheDocument();
  });

  it.each([
    ComponentType.Checkboxes,
    ComponentType.Dropdown,
    ComponentType.Likert,
    ComponentType.MultipleSelect,
    ComponentType.RadioButtons,
  ])('should render options config when the component type matches', (componentType) => {
    renderComponentMainConfig(mainConfigComponentMock(componentType));
    const optionsHeader = screen.getByText(textMock('ux_editor.options.section_heading'));
    expect(optionsHeader).toBeInTheDocument();
  });

  it('should render image config when the component type matches', async () => {
    renderComponentMainConfig(mainConfigComponentMock(ComponentType.Image));
    const imageHeader = screen.getByText(
      textMock('ux_editor.properties_panel.texts.sub_title_images'),
    );
    expect(imageHeader).toBeInTheDocument();
  });

  it('should not render any config when the component type does not match', async () => {
    renderComponentMainConfig(component1Mock);
    const wrapper = screen.getByTestId('component-wrapper');
    expect(wrapper).toBeEmptyDOMElement();
  });
});

const renderComponentMainConfig = (component: FormItem) => {
  const handleComponentChange = jest.fn();
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.LayoutSetsExtended, org, app], layoutSetsExtendedMock);
  return renderWithProviders(
    <div data-testid='component-wrapper'>
      <ComponentMainConfig component={component} handleComponentChange={handleComponentChange} />
    </div>,
    { queryClient },
  );
};
