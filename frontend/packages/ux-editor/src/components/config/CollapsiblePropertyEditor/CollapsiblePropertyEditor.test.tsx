import React from 'react';
import {
  CollapsiblePropertyEditor,
  type CollapsiblePropertyEditorProps,
} from './CollapsiblePropertyEditor';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { renderWithProviders } from 'app-development/test/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';

// Test data
const label = 'Test label';
const children = <div>Test children</div>;
const icon = <div>Test icon</div>;

describe('CollapsiblePropertyEditor', () => {
  it('should render the label', () => {
    renderCollapsiblePropertyEditor({ label: label });
    expect(screen.getByText('Test label')).toBeInTheDocument();
  });

  it('should render the icon', () => {
    renderCollapsiblePropertyEditor({ icon: <div>Test icon</div> });
    expect(screen.getByText('Test icon')).toBeInTheDocument();
  });

  it('should render the children', () => {
    renderCollapsiblePropertyEditor();
    expect(screen.queryByText('Test children')).not.toBeInTheDocument();
  });

  it('should render the children when the button is clicked', async () => {
    const user = userEvent.setup();
    renderCollapsiblePropertyEditor();
    await user.click(screen.getByText('Test label'));
    expect(screen.getByText('Test children')).toBeInTheDocument();
  });

  it('should hide the children when the close button is clicked', async () => {
    const user = userEvent.setup();
    renderCollapsiblePropertyEditor();
    await user.click(screen.getByText('Test label'));
    expect(screen.getByText('Test children')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: textMock('general.close') }));
    expect(screen.queryByText('Test children')).not.toBeInTheDocument();
  });
});

const defaultProps: CollapsiblePropertyEditorProps = {
  label,
  children,
  icon,
};

const renderCollapsiblePropertyEditor = (props: Partial<CollapsiblePropertyEditorProps> = {}) => {
  renderWithProviders()(<CollapsiblePropertyEditor {...defaultProps} {...props} />);
};
