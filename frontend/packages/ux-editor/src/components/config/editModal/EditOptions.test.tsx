import React from 'react';
import { screen, waitFor } from '@testing-library/react';

import { EditOptions } from './EditOptions';
import { renderWithMockStore, renderHookWithMockStore } from '../../../testing/mocks';
import { useLayoutSchemaQuery } from '../../../hooks/queries/useLayoutSchemaQuery';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import { ComponentType } from 'app-shared/types/ComponentType';
import type {
  FormCheckboxesComponent,
  FormRadioButtonsComponent,
} from '../../../types/FormComponent';

const waitForData = async () => {
  const layoutSchemaResult = renderHookWithMockStore()(() => useLayoutSchemaQuery())
    .renderHookResult.result;
  await waitFor(() => expect(layoutSchemaResult.current[0].isSuccess).toBe(true));
};

const mockComponent: FormCheckboxesComponent | FormRadioButtonsComponent = {
  id: 'c24d0812-0c34-4582-8f31-ff4ce9795e96',
  type: ComponentType.RadioButtons,
  textResourceBindings: {
    title: 'ServiceName',
  },
  maxLength: 10,
  itemType: 'COMPONENT',
  dataModelBindings: {},
};

const render = async ({ component = mockComponent, handleComponentChange = jest.fn() } = {}) => {
  await waitForData();

  return renderWithMockStore()(
    <EditOptions handleComponentChange={handleComponentChange} component={component} />,
  );
};

describe('EditOptions', () => {
  it('should render', async () => {
    await render();
    expect(
      screen.getByText(textMock('ux_editor.modal_properties_add_radio_button_options')),
    ).toBeInTheDocument();
  });

  it('should show code list input by default when neither options nor optionId are set', async () => {
    await render();
    expect(screen.getByText(textMock('ux_editor.modal_add_options_codelist'))).toBeInTheDocument();
  });

  it('should show manual input when component has options defined', async () => {
    await render({
      component: {
        ...mockComponent,
        options: [{ label: 'option1', value: 'option1' }],
      },
    });
    expect(screen.getByText(textMock('ux_editor.modal_add_options_manual'))).toBeInTheDocument();
  });

  it('should show code list input when component has optionsId defined', async () => {
    await render({
      component: {
        ...mockComponent,
        optionsId: 'optionsId',
      },
    });
    expect(screen.getByText(textMock('ux_editor.modal_add_options_manual'))).toBeInTheDocument();
  });
});
