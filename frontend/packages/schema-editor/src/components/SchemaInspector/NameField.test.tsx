import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import type { NameFieldProps } from './NameField';
import { NameField } from './NameField';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { combinationNodeMock, uiSchemaNodesMock } from '../../../test/mocks/uiSchemaMock';
import { SchemaModel } from '@altinn/schema-model';

const user = userEvent.setup();

// Test data:
const defaultProps: NameFieldProps = {
  id: 'test-id',
  label: 'test-label',
  pointer: combinationNodeMock.pointer,
  onKeyDown: jest.fn(),
  disabled: false,
  handleSave: jest.fn(),
};

const render = async (props?: Partial<NameFieldProps>) =>
  renderWithProviders({
    appContextProps: { schemaModel: SchemaModel.fromArray(uiSchemaNodesMock) },
  })(<NameField {...defaultProps} {...props} />);

describe('NameField', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders the component', async () => {
    await render();

    expect(screen.getByText(defaultProps.label)).toBeInTheDocument();
    expect(screen.getByRole('textbox').getAttribute('value')).toBe('test');
  });

  it('should not save if name contains invalid characters', async () => {
    await render();
    await waitFor(() => user.type(screen.getByRole('textbox'), '@'));
    user.tab();
    const error = await screen.findByText(textMock('schema_editor.nameError_invalidCharacter'));
    expect(error).toBeInTheDocument();
    expect(defaultProps.handleSave).not.toHaveBeenCalled();
  });

  it('should not save if name is already in use', async () => {
    await render();
    await waitFor(() => user.type(screen.getByRole('textbox'), '2'));
    user.tab();
    const error = await screen.findByText(textMock('schema_editor.nameError_alreadyInUse'));
    expect(error).toBeInTheDocument();
    expect(defaultProps.handleSave).not.toHaveBeenCalled();
  });

  it('should save if name is valid', async () => {
    await render();
    await waitFor(() => user.type(screen.getByRole('textbox'), '3'));
    user.tab();
    await waitFor(() => expect(defaultProps.handleSave).toHaveBeenCalledTimes(1));
  });
});
