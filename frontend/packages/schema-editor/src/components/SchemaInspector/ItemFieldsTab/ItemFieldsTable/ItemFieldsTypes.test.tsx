import React from 'react';
import { screen } from '@testing-library/react';
import { ItemFieldType } from './ItemFieldType ';
import type { ItemFieldTypeProps } from './ItemFieldType ';
import { type UiSchemaNode } from '@altinn/schema-model';
import {
  combinationNodeMock,
  referenceNodeMock,
} from '../../../../../../schema-editor/test/mocks/uiSchemaMock';
import { renderWithProviders } from 'app-development/test/mocks';
import { useSavableSchemaModel } from '@altinn/schema-editor/hooks/useSavableSchemaModel';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';
import userEvent from '@testing-library/user-event';

jest.mock('@altinn/schema-editor/hooks/useSavableSchemaModel');
jest.mock('@altinn/schema-editor/hooks/useSchemaEditorAppContext');

const defaultNode: UiSchemaNode = combinationNodeMock;
const typeLabel = 'Type Label';
const kindLabel = 'Kind Label';
const referenceNode = referenceNodeMock;

describe('ItemFieldType', () => {
  afterEach(jest.clearAllMocks);
  beforeEach(() => {
    (useSchemaEditorAppContext as jest.Mock).mockReturnValue({
      setSelectedTypePointer: jest.fn(),
    });
  });

  test('should render typeLabel when typeLabel is provided', async () => {
    renderItemFieldType({ fieldNode: defaultNode, typeLabel: typeLabel });
    expect(screen.getByText(typeLabel)).toBeInTheDocument();
  });

  test('should render kindLabel when kindLabel is provided', () => {
    renderItemFieldType({ fieldNode: defaultNode, kindLabel: kindLabel });
    expect(screen.getByText(kindLabel)).toBeInTheDocument();
  });

  test('Should render StudioReferenceButton when fieldNode is a reference', async () => {
    const user = userEvent.setup();
    const setSelectedTypePointer = jest.fn();
    (useSavableSchemaModel as jest.Mock).mockReturnValue({
      getReferredNode: jest.fn().mockReturnValue({ schemaPointer: '/path/to/referredNode' }),
    });
    (useSchemaEditorAppContext as jest.Mock).mockReturnValue({
      setSelectedTypePointer,
    });

    renderItemFieldType({ fieldNode: referenceNode });
    const button = screen.getByRole('button', { name: /referredNode/i });
    expect(button).toBeInTheDocument();

    await user.click(button);
    expect(setSelectedTypePointer).toHaveBeenCalledWith(referenceNode.reference);
  });

  const renderItemFieldType = (
    props: ItemFieldTypeProps = { fieldNode: defaultNode, kindLabel, typeLabel },
  ) => {
    renderWithProviders({})(<ItemFieldType {...props} />);
  };
});
