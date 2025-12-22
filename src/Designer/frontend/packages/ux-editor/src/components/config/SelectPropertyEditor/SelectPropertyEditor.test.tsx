import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { renderWithProviders } from 'app-development/test/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { SelectPropertyEditor, type SelectPropertyEditorProps } from './SelectPropertyEditor';

const children = <div>Test children</div>;
const value = <div>Test value</div>;
const property = 'Test property';

describe('SelectPropertyEditor', () => {
  it('should render the children when button is clicked', async () => {
    const user = userEvent.setup();
    renderSelectPropertyEditor();
    await user.click(screen.getByText('Test property'));
    expect(screen.getByText('Test children')).toBeInTheDocument();
  });

  it('should hide the children when the cancel button is clicked', async () => {
    const user = userEvent.setup();
    renderSelectPropertyEditor();
    await user.click(screen.getByText('Test property'));
    expect(screen.getByText('Test children')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: textMock('general.cancel') }));
    expect(screen.queryByText('Test children')).not.toBeInTheDocument();
  });

  it('should render value', () => {
    renderSelectPropertyEditor();
    expect(screen.getByText('Test value')).toBeInTheDocument();
  });

  it('should render the property', () => {
    renderSelectPropertyEditor({ property: 'Test property' });
    expect(screen.getByText('Test property')).toBeInTheDocument();
  });
});

const defaultProps: SelectPropertyEditorProps = {
  children,
  value,
  property,
  onSave: jest.fn(),
  onCancel: jest.fn(),
  isSaveDisabled: false,
};

const renderSelectPropertyEditor = (props: Partial<SelectPropertyEditorProps> = {}) => {
  renderWithProviders()(<SelectPropertyEditor {...defaultProps} {...props} />);
};
