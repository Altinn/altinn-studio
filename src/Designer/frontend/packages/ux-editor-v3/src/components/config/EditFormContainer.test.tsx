import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { IEditFormContainerProps } from './EditFormContainer';
import { EditFormContainer } from './EditFormContainer';
import { useFormLayoutsQuery } from '../../hooks/queries/useFormLayoutsQuery';
import { useFormLayoutSettingsQuery } from '../../hooks/queries/useFormLayoutSettingsQuery';
import {
  formLayoutSettingsMock,
  renderHookWithMockStore,
  renderWithMockStore,
} from '../../testing/mocks';
import { useLayoutSchemaQuery } from '../../hooks/queries/useLayoutSchemaQuery';
import {
  container1IdMock,
  externalLayoutsMock,
  layoutMock,
} from '@altinn/ux-editor-v3/testing/layoutMock';
import { layoutSet1NameMock } from '@altinn/ux-editor-v3/testing/layoutSetsMock';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { FormLayoutsResponseV3 } from 'app-shared/types/api';
import type { ILayoutSettings } from 'app-shared/types/global';
import type { FormContainer } from '../../types/FormContainer';
import { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import { app, org } from '@studio/testing/testids';

const user = userEvent.setup();

// Test data:
const selectedLayoutSet = layoutSet1NameMock;
const accordionContainer: FormContainer = {
  id: 'accordionContainerId',
  itemType: 'CONTAINER',
  type: ComponentTypeV3.Accordion,
  pageIndex: 1,
  propertyPath: 'definitions/accordionComponent',
};
const accordionGroupContainer: FormContainer = {
  id: 'accordionGroupContainerId',
  itemType: 'CONTAINER',
  type: ComponentTypeV3.AccordionGroup,
  pageIndex: 1,
  propertyPath: 'definitions/accordionGroupComponent',
};
const buttonGroupContainer: FormContainer = {
  id: 'buttonGroupContainerId',
  itemType: 'CONTAINER',
  type: ComponentTypeV3.ButtonGroup,
  pageIndex: 1,
  propertyPath: 'definitions/buttonGroupComponent',
};
const nonEditableContainers = [accordionContainer, accordionGroupContainer, buttonGroupContainer];

const handleContainerUpdateMock = jest.fn();

describe('EditFormContainer', () => {
  afterEach(jest.clearAllMocks);

  it('should render the component', async () => {
    await render();

    expect(
      screen.getByText(textMock('ux_editor.modal_properties_group_change_id')),
    ).toBeInTheDocument();
  });

  it.each(nonEditableContainers)(
    'should show info message when container is not group',
    async (container) => {
      await render({ container });
      expect(
        screen.getByText(textMock('ux_editor.container_not_editable_info')),
      ).toBeInTheDocument();
    },
  );

  it('should update form when editing field', async () => {
    await render();

    const containerIdInput = screen.getByText(
      textMock('ux_editor.modal_properties_group_change_id'),
    );
    await user.type(containerIdInput, 'test');
    expect(handleContainerUpdateMock).toHaveBeenCalledTimes(4);
  });

  it('should display an error when containerId is invalid', async () => {
    await render();

    const containerIdInput = screen.getByText(
      textMock('ux_editor.modal_properties_group_change_id'),
    );
    await user.type(containerIdInput, 'test@');
    expect(
      screen.getByText(textMock('ux_editor.modal_properties_component_id_not_valid')),
    ).toBeInTheDocument();
    expect(handleContainerUpdateMock).toHaveBeenCalledTimes(4);
  });

  test('user should be able to choose which titles to display in table', async () => {
    await render({
      container: {
        ...layoutMock.containers[container1IdMock],
        id: 'test',
        maxCount: 2,
      },
    });

    const repeatingGroupSwitch = screen.getByLabelText(
      textMock('ux_editor.modal_properties_group_repeating'),
    );

    await user.click(repeatingGroupSwitch);

    expect(
      screen.getByText(textMock('ux_editor.modal_properties_group_table_headers')),
    ).toBeInTheDocument();

    const firstCheckbox = screen.getByRole('checkbox', { name: 'Component-1' });
    await user.click(firstCheckbox);

    expect(handleContainerUpdateMock).toHaveBeenCalled();
  });
});

const waitForData = async () => {
  const getFormLayoutsV3 = jest
    .fn()
    .mockImplementation(() => Promise.resolve<FormLayoutsResponseV3>(externalLayoutsMock));
  const getFormLayoutSettings = jest
    .fn()
    .mockImplementation(() => Promise.resolve<ILayoutSettings>(formLayoutSettingsMock));
  const formLayoutsResult = renderHookWithMockStore(
    {},
    { getFormLayoutsV3 },
  )(() => useFormLayoutsQuery(org, app, selectedLayoutSet)).renderHookResult.result;
  const settingsResult = renderHookWithMockStore(
    {},
    { getFormLayoutSettings },
  )(() => useFormLayoutSettingsQuery(org, app, selectedLayoutSet)).renderHookResult.result;
  const layoutSchemaResult = renderHookWithMockStore()(() => useLayoutSchemaQuery())
    .renderHookResult.result;
  await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));
  await waitFor(() => expect(settingsResult.current.isSuccess).toBe(true));
  await waitFor(() => expect(layoutSchemaResult.current[0].isSuccess).toBe(true));
};

const render = async (props: Partial<IEditFormContainerProps> = {}) => {
  const allProps: IEditFormContainerProps = {
    editFormId: container1IdMock,
    container: { ...layoutMock.containers[container1IdMock], id: 'test' },
    handleContainerUpdate: handleContainerUpdateMock,
    ...props,
  };

  await waitForData();

  return renderWithMockStore()(<EditFormContainer {...allProps} />);
};
