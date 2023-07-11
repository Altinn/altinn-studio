import React from 'react';
import { screen, waitFor } from '@testing-library/react';

import { EditNumberValue } from './EditNumberValue';
import { renderWithMockStore, renderHookWithMockStore } from '../../../testing/mocks';
import { useLayoutSchemaQuery } from '../../../hooks/queries/useLayoutSchemaQuery';
import { mockUseTranslation } from '../../../../../../testing/mocks/i18nMock';
import { ComponentType } from 'app-shared/types/ComponentType';

jest.mock('react-i18next', () => ({
  useTranslation: () => mockUseTranslation({}),
}));

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
        type: ComponentType.Input,
        textResourceBindings: {
          title: 'ServiceName',
        },
        maxLength,
        itemType: 'COMPONENT',
        dataModelBindings: {},
      }}
    />
  );
};

describe('EditNumberValue', () => {
  it('should render', async () => {
    await render();
    expect(screen.getByText('maxLength')).toBeInTheDocument();
  });
});
