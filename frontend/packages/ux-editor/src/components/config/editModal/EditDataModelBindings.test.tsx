import React from 'react';
import { screen } from '@testing-library/react';

import { appDataMock, renderWithMockStore, textResourcesMock } from '../../../testing/mocks';
import { IAppDataState } from '../../../features/appData/appDataReducers';
import { EditDataModelBindings } from './EditDataModelBindings';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import { ComponentType } from 'app-shared/types/ComponentType';

const render = ({ dataModelBindings = {}, handleComponentChange = jest.fn() } = {}) => {
  const appData: IAppDataState = {
    ...appDataMock,
    textResources: {
      ...textResourcesMock,
    },
  }
  renderWithMockStore({ appData })(
    <EditDataModelBindings
      handleComponentChange={handleComponentChange}
      component={{
        id: 'someComponentId',
        type: ComponentType.Input,
        textResourceBindings: {
          title: 'ServiceName',
        },
        dataModelBindings,
        itemType: 'COMPONENT',
      }}
      renderOptions={{
        uniqueKey: 'someComponentId-datamodel-select'
      }}
    />,
  );
};

describe('EditDataModelBindings', () => {
  it('should show select with no selected option by default', () => {
    render();
    expect(screen.getByText(textMock('ux_editor.modal_properties_data_model_helper'))).toBeInTheDocument();
    expect(screen.getByRole('combobox').getAttribute('value')).toEqual("");
  });

  it('should show select with provided data model binding', () => {
    render({ dataModelBindings: {
      simpleBinding: 'testModel.field1',
    } });
    expect(screen.getByText(textMock('ux_editor.modal_properties_data_model_helper'))).toBeInTheDocument();
    expect(screen.getByText('testModel.field1')).toBeInTheDocument();
  })
});
