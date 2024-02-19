import React from 'react';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithMockStore } from '../../../../testing/mocks';
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
import { formDesignerMock } from '../../../../testing/stateMocks';
import type { IFormLayouts } from '../../../../types/global';

// Test data:
const org = 'org';
const app = 'app';
const layoutSetName = formDesignerMock.layout.selectedLayoutSet;
const layouts: IFormLayouts = {
  [layout1NameMock]: layoutMock,
};

const handleComponentUpdateMock = jest.fn();

const user = userEvent.setup();

const render = async () => {
  queryClientMock.setQueryData([QueryKey.FormLayouts, org, app, layoutSetName], layouts);
  renderWithMockStore()(
    <RepeatingGroupComponent
      editFormId={container2IdMock}
      component={{ ...layoutMock.containers[container2IdMock] }}
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

  it('should call handleComponentUpdate with data model binding when changed', async () => {
    const dataBindingNameMock = 'element';
    const maxCountMock = 2;
    queryClientMock.setQueryData(
      [QueryKey.DatamodelMetadata, org, app],
      [{ dataBindingName: dataBindingNameMock, maxOccurs: maxCountMock }],
    );
    await render();

    const dataModelSelect = screen.getByRole('combobox', {
      name: textMock('ux_editor.modal_properties_data_model_helper'),
    });
    expect(dataModelSelect).toBeInTheDocument();
    await act(() => user.click(dataModelSelect));
    const dataModelOption = screen.getByRole('option', { name: dataBindingNameMock });
    await act(() => user.click(dataModelOption));

    expect(handleComponentUpdateMock).toHaveBeenCalled();
    expect(handleComponentUpdateMock).toHaveBeenCalledWith({
      ...layoutMock.containers[container2IdMock],
      maxCount: maxCountMock,
      dataModelBindings: { group: dataBindingNameMock },
    });
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
