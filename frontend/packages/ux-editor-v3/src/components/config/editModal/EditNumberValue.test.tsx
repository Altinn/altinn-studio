import React from 'react';
import { screen, waitFor } from '@testing-library/react';

import { EditNumberValue } from './EditNumberValue';
import { renderWithMockStore, renderHookWithMockStore } from '../../../testing/mocks';
import { useLayoutSchemaQuery } from '../../../hooks/queries/useLayoutSchemaQuery';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import userEvent from '@testing-library/user-event';

const waitForData = async () => {
  const layoutSchemaResult = renderHookWithMockStore()(() => useLayoutSchemaQuery())
    .renderHookResult.result;
  await waitFor(() => expect(layoutSchemaResult.current[0].isSuccess).toBe(true));
};

const render = async ({ maxLength = undefined, handleComponentChange = jest.fn() } = {}) => {
  await waitForData();

  return renderWithMockStore()(
    <EditNumberValue
      handleComponentChange={handleComponentChange}
      propertyKey='maxLength'
      component={{
        id: 'c24d0812-0c34-4582-8f31-ff4ce9795e96',
        type: ComponentTypeV3.Input,
        textResourceBindings: {
          title: 'ServiceName',
        },
        maxLength,
        itemType: 'COMPONENT',
        dataModelBindings: {},
      }}
    />,
  );
};

describe('EditNumberValue', () => {
  it('should render', async () => {
    await render();
    expect(
      screen.getByText(textMock('ux_editor.component_properties.maxLength')),
    ).toBeInTheDocument();
  });

  it('should save to backend when changing value, including the case of changing it to undefined/empty', async () => {
    const user = userEvent.setup();
    const mockhHandleComponentChange = jest.fn();
    await render({ handleComponentChange: mockhHandleComponentChange });

    const input = screen.getByRole('textbox');
    await user.type(input, '12');
    // The component is updated for each keystroke, so we expect the mock to be called twice -
    // I think it should prevent this behavior with this new issue: https://github.com/Altinn/altinn-studio/issues/11989
    expect(mockhHandleComponentChange).toHaveBeenCalledTimes(2);

    mockhHandleComponentChange.mockClear();
    await user.clear(input);
    expect(mockhHandleComponentChange).toHaveBeenCalledTimes(1);
  });
});
