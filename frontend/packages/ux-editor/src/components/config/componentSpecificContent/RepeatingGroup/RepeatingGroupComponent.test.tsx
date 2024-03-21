import React from 'react';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../../testing/mocks';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';
import { RepeatingGroupComponent } from './RepeatingGroupComponent';
import {
  component2IdMock,
  container2IdMock,
  layout1NameMock,
  layoutMock,
} from '../../../../testing/layoutMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import type { IFormLayouts } from '../../../../types/global';
import type { FormContainer } from '../../../../types/FormContainer';
import type { ComponentType } from 'app-shared/types/ComponentType';

// Test data:
const org = 'org';
const app = 'app';
const layoutSetName = layout1NameMock;
const layouts: IFormLayouts = {
  [layout1NameMock]: layoutMock,
};

const handleComponentUpdateMock = jest.fn();

const user = userEvent.setup();

const render = async () => {
  queryClientMock.setQueryData([QueryKey.FormLayouts, org, app, layoutSetName], layouts);
  const container: FormContainer<ComponentType.RepeatingGroup> = {
    ...(layoutMock.containers[container2IdMock] as FormContainer<ComponentType.RepeatingGroup>),
  };
  renderWithProviders(
    <RepeatingGroupComponent
      editFormId={container2IdMock}
      component={container}
      handleComponentUpdate={handleComponentUpdateMock}
    />,
  );
};

describe('RepeatingGroupComponent', () => {
  afterEach(jest.clearAllMocks);

  it('user should be able to choose which titles to display in table', async () => {
    await render();

    expect(
      screen.getByText(textMock('ux_editor.modal_properties_group_table_headers')),
    ).toBeInTheDocument();

    const firstCheckbox = screen.getByRole('checkbox', { name: component2IdMock });
    expect(firstCheckbox).toBeInTheDocument();
    await act(() => user.click(firstCheckbox));

    expect(handleComponentUpdateMock).toHaveBeenCalled();
  });

  it('handleComponentUpdate is called with "tableHeaders: undefined" when #headers equals #items', async () => {
    await render();

    const firstCheckbox = screen.getByRole('checkbox', { name: component2IdMock });
    // Needs two clicks to trigger the code
    await act(() => user.click(firstCheckbox));
    await act(() => user.click(firstCheckbox));

    expect(handleComponentUpdateMock).toHaveBeenCalledTimes(2);
    expect(handleComponentUpdateMock).toHaveBeenLastCalledWith({
      ...layoutMock.containers[container2IdMock],
      tableHeaders: undefined,
    });
  });
});
