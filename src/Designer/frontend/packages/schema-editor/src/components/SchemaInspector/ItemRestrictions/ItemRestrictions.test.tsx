import React from 'react';
import { screen } from '@testing-library/react';
import type { ItemRestrictionsProps } from './ItemRestrictions';
import { ItemRestrictions } from './ItemRestrictions';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import userEvent from '@testing-library/user-event';
import { fieldNode1Mock, uiSchemaNodesMock } from '../../../../test/mocks/uiSchemaMock';
import { SchemaModel } from '@altinn/schema-model';

const user = userEvent.setup();

// Test data:
const defaultProps: ItemRestrictionsProps = { schemaNode: fieldNode1Mock };
const saveDataModel = jest.fn();

describe('ItemRestrictions', () => {
  afterAll(jest.clearAllMocks);

  test('item restrictions require checkbox to work', async () => {
    renderItemRestrictions();
    await user.click(screen.getByRole('checkbox'));
    expect(saveDataModel).toHaveBeenCalledTimes(1);
  });

  test('item restrictions tab require checkbox to decheck', async () => {
    renderItemRestrictions();
    await user.click(screen.getByRole('checkbox'));
    expect(saveDataModel).toHaveBeenCalledTimes(2);
  });
});

const renderItemRestrictions = (props?: Partial<ItemRestrictionsProps>) =>
  renderWithProviders({
    appContextProps: { schemaModel: SchemaModel.fromArray(uiSchemaNodesMock), save: saveDataModel },
  })(<ItemRestrictions {...defaultProps} {...props} />);
