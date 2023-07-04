import React from 'react';
import { act, screen } from '@testing-library/react';
import type { ItemRestrictionsProps } from './ItemRestrictions';
import { ItemRestrictions } from './ItemRestrictions';
import { renderWithProviders } from '../../../test/renderWithProviders';
import userEvent from '@testing-library/user-event';
import { queryClientMock } from '../../../test/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { fieldNode1Mock, uiSchemaNodesMock } from '../../../test/mocks/uiSchemaMock';

const user = userEvent.setup();

// Test data:
const defaultProps: ItemRestrictionsProps = { ...fieldNode1Mock };
const org = 'org';
const app = 'app';
const modelPath = 'test';
const saveDatamodel = jest.fn();

describe('ItemRestrictions', () => {
  afterAll(jest.clearAllMocks);

  test('item restrictions require checkbox to work', async () => {
    renderItemRestrictions();
    await act(() => user.click(screen.getByRole('checkbox')));
    expect(saveDatamodel).toHaveBeenCalledTimes(1);
  });

  test('item restrictions tab require checkbox to decheck', async () => {
    renderItemRestrictions();
    await act(() => user.click(screen.getByRole('checkbox')));
    expect(saveDatamodel).toHaveBeenCalledTimes(2);
  });
});

const renderItemRestrictions = (props?: Partial<ItemRestrictionsProps>) => {
  queryClientMock.setQueryData([QueryKey.Datamodel, org, app, modelPath], uiSchemaNodesMock);
  return renderWithProviders({
    appContextProps: { modelPath },
    servicesContextProps: { saveDatamodel },
  })(<ItemRestrictions {...defaultProps} {...props} />);
};
