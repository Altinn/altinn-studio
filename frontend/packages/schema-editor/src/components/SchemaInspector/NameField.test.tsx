import React from 'react';
import { screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import type { NameFieldProps } from './NameField';
import { NameField } from './NameField';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { queryClientMock } from '../../../test/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import {
  parentNodeMock,
  uiSchemaNodesMock
} from '../../../test/mocks/uiSchemaMock';
import { SchemaState } from '@altinn/schema-editor/types';

const user = userEvent.setup();

// Test data:
const org = 'org';
const app = 'app';
const modelPath = 'test';
const saveDatamodel = jest.fn();
const defaultProps: NameFieldProps = {
  id: 'test-id',
  label: 'test-label',
  pointer: parentNodeMock.pointer,
  onKeyDown: jest.fn(),
  hideLabel: false,
  disabled: false,
  callback: jest.fn(),
};
const defaultState: Partial<SchemaState> = {
  selectedEditorTab: 'properties',
  selectedPropertyNodeId: parentNodeMock.pointer,
};

const render = async (
  props?: Partial<NameFieldProps>,
  state: Partial<SchemaState> = {}
) => {
  queryClientMock.setQueryData(
    [QueryKey.Datamodel, org, app, modelPath],
    uiSchemaNodesMock,
  );

  return renderWithProviders({
    state: { ...defaultState, ...state },
    appContextProps: { modelPath },
    servicesContextProps: { saveDatamodel },
  })(<NameField {...defaultProps} {...props} />);
};

describe('NameField', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders the component', async () => {
    await render();

    expect(screen.getByText(`${defaultProps.label} *`)).toBeInTheDocument();
    expect(screen.getByRole('textbox').getAttribute('value')).toBe('test');
  });

  it('should not save if name contains invalid characters', async () => {
    await render();
    await act(() => user.type(screen.getByRole('textbox'), '@'));
    expect(screen.getByText(textMock('schema_editor.nameError_invalidCharacter'))).toBeInTheDocument();
  });

  it('should not save if name is already in use', async () => {
    await render();
    await act(() => user.type(screen.getByRole('textbox'), '2'));
    expect(screen.getByText(textMock('schema_editor.nameError_alreadyInUse'))).toBeInTheDocument();
  });

  it('should save if name is valid', async () => {
    await render();
    await act(() => user.type(screen.getByRole('textbox'), '3'));
    await act(() => user.tab());
    expect(defaultProps.callback).toHaveBeenCalledTimes(1);
    expect(saveDatamodel).toHaveBeenCalledTimes(1);
  });
});
