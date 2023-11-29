import React from 'react';
import { screen, waitFor } from '@testing-library/react';

import { EditStringValue } from './EditStringValue';
import { renderWithMockStore, renderHookWithMockStore } from '../../../testing/mocks';
import { useLayoutSchemaQuery } from '../../../hooks/queries/useLayoutSchemaQuery';
import { mockUseTranslation } from '../../../../../../testing/mocks/i18nMock';
import { ComponentType } from 'app-shared/types/ComponentType';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';

jest.mock('react-i18next', () => ({
  useTranslation: () => mockUseTranslation({}),
}));

const user = userEvent.setup();

const waitForData = async () => {
  const layoutSchemaResult = renderHookWithMockStore()(() => useLayoutSchemaQuery())
    .renderHookResult.result;
  await waitFor(() => expect(layoutSchemaResult.current[0].isSuccess).toBe(true));
};

const render = async ({ maxLength = undefined, handleComponentChange = jest.fn() } = {}) => {
  await waitForData();

  return renderWithMockStore()(
    <EditStringValue
      handleComponentChange={handleComponentChange}
      propertyKey='maxLength'
      component={{
        id: 'c24d0812-0c34-4582-8f31-ff4ce9795e96',
        type: ComponentType.Input,
        textResourceBindings: {
          title: 'ServiceName',
        },
        maxLength: maxLength || '',
        itemType: 'COMPONENT',
        dataModelBindings: {},
      }}
    />,
  );
};
describe('EditStringValue', () => {
  it('should render', async () => {
    const handleComponentChange = jest.fn();
    await render({ handleComponentChange });
  });

  it(' Ensure that the onChange handler is called with the correct arguments', async () => {
    const handleComponentChange = jest.fn();
    await render({ handleComponentChange });
    const inputElement = screen.getByLabelText('maxLength');
    await act(() => user.type(inputElement, 'new value'));
    expect(handleComponentChange).toHaveBeenCalledWith({
      id: 'c24d0812-0c34-4582-8f31-ff4ce9795e96',
      type: ComponentType.Input,
      textResourceBindings: {
        title: 'ServiceName',
      },
      maxLength: 'new value',
      itemType: 'COMPONENT',
      dataModelBindings: {},
    });
  });
});
