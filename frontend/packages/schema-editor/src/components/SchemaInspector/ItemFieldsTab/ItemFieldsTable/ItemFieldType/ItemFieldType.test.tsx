import React from 'react';
import { screen } from '@testing-library/react';
import { ItemFieldType } from './ItemFieldType';
import type { ItemFieldTypeProps } from './ItemFieldType';
import { type UiSchemaNode } from '@altinn/schema-model';
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

  it('Should render reference link when fieldNode is a reference', async () => {
    const user = userEvent.setup();
    renderItemFieldType({ fieldNode: referenceNodeMock });
    const linkButton = screen.getByRole('button');
    await user.click(linkButton);
    expect(setSelectedTypePointer).toHaveBeenCalledTimes(1);
  });
});

const renderItemFieldType = (props: ItemFieldTypeProps = { fieldNode: defaultNode }) => {
  renderWithProviders({
    appContextProps: {
      setSelectedTypePointer,
    },
  })(<ItemFieldType {...props} />);
};
