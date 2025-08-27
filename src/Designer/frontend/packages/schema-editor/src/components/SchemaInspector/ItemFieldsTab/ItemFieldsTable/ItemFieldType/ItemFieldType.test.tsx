import React from 'react';
import { screen } from '@testing-library/react';
import { ItemFieldType } from './ItemFieldType';
import type { ItemFieldTypeProps } from './ItemFieldType';
import { extractNameFromPointer, type UiSchemaNode } from '@altinn/schema-model/index';
import {
  combinationNodeMock,
  referenceNodeMock,
  stringDefinitionNodeMock,
  objectNodeMock,
} from '../../../../../../test/mocks/uiSchemaMock';
import { renderWithProviders } from '../../../../../../test/renderWithProviders';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

const defaultNode: UiSchemaNode = combinationNodeMock;
const setSelectedTypePointer = jest.fn();

const stringTypeLabel = textMock('schema_editor.string');
const objectTypeLabel = textMock('schema_editor.object');

const combinationKindLabel = textMock('schema_editor.combination');

describe('ItemFieldType', () => {
  afterEach(jest.clearAllMocks);

  it('should render string type label', () => {
    renderItemFieldType({ fieldNode: stringDefinitionNodeMock });
    expect(screen.getByText(stringTypeLabel)).toBeInTheDocument();
  });

  it('should render object type label', () => {
    renderItemFieldType({ fieldNode: objectNodeMock });
    expect(screen.getByText(objectTypeLabel)).toBeInTheDocument();
  });

  it('should render combination kind label', () => {
    renderItemFieldType({ fieldNode: defaultNode });
    expect(screen.getByText(combinationKindLabel)).toBeInTheDocument();
  });

  it('Should render reference link when fieldNode is a reference', () => {
    renderItemFieldType({ fieldNode: referenceNodeMock });
    const referenceName = extractNameFromPointer(referenceNodeMock.reference);
    expect(screen.getByRole('button')).toHaveAccessibleName(referenceName);
  });

  it('Calls setSelectedTypePointer with correct reference when the reference button is clicked', async () => {
    const user = userEvent.setup();
    renderItemFieldType({ fieldNode: referenceNodeMock });
    await user.click(screen.getByRole('button'));
    expect(setSelectedTypePointer).toHaveBeenCalledTimes(1);
    expect(setSelectedTypePointer).toHaveBeenCalledWith(referenceNodeMock.reference);
  });
});

const renderItemFieldType = (props: ItemFieldTypeProps = { fieldNode: defaultNode }) => {
  renderWithProviders({
    appContextProps: {
      setSelectedTypePointer,
    },
  })(<ItemFieldType {...props} />);
};
