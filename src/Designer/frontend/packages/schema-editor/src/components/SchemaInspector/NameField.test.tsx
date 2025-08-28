import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
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
  schemaPointer: combinationNodeMock.schemaPointer,
  onKeyDown: jest.fn(),
  disabled: false,
  handleSave: jest.fn(),
};

const render = async (props?: Partial<NameFieldProps>) =>
  renderWithProviders({
    appContextProps: { schemaModel: SchemaModel.fromArray(uiSchemaNodesMock) },
  })(<NameField {...defaultProps} {...props} />);

async function typeAndBlurNameField(text: string) {
  await user.type(screen.getByRole('textbox'), text);
  await user.tab();
}

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
    await typeAndBlurNameField('@');
    expect(
      screen.getByText(textMock('schema_editor.nameError_invalidCharacter')),
    ).toBeInTheDocument();
    expect(defaultProps.handleSave).not.toHaveBeenCalled();
  });

  it('should not save if name is already in use', async () => {
    await render();
    await typeAndBlurNameField('2');
    expect(screen.getByText(textMock('schema_editor.nameError_alreadyInUse'))).toBeInTheDocument();
    expect(defaultProps.handleSave).not.toHaveBeenCalled();
  });

  it('should not save if name is a c sharp keyword', async () => {
    await render();
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await typeAndBlurNameField('namespace');

    expect(
      screen.getByText(textMock('schema_editor.nameError_cSharpReservedKeyword')),
    ).toBeInTheDocument();
    expect(defaultProps.handleSave).not.toHaveBeenCalled();
  });

  it('should save if name is valid', async () => {
    await render();
    await typeAndBlurNameField('3');
    expect(defaultProps.handleSave).toHaveBeenCalledTimes(1);
  });
});
