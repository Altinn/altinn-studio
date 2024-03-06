import React, { createRef } from 'react';
import { render, screen, within } from '@testing-library/react';
import { StudioPropertyFieldset } from './StudioPropertyFieldset';

jest.mock('./StudioPropertyFieldset.module.css', () => ({
  propertyFieldset: 'propertyFieldset',
  menubar: 'menubar',
  content: 'content',
  compact: 'compact',
}));

describe('StudioPropertyFieldset', () => {
  it('Renders a group component with the given legend', () => {
    const legend = 'Test legend';
    render(<StudioPropertyFieldset legend={legend} />);
    screen.getByRole('group', { name: legend });
  });

  it('Renders the menubar', () => {
    const menubarTestId = 'menubar';
    const menubarComponent = <div data-testid={menubarTestId} />;
    render(<StudioPropertyFieldset legend='Test' menubar={menubarComponent} />);
    const group = screen.getByRole('group');
    const menubar = within(group).getByRole('menubar');
    within(menubar).getByTestId(menubarTestId);
  });

  it('Appends the given class name to the default one', () => {
    const className = 'test-class';
    render(<StudioPropertyFieldset legend='Test' className={className} />);
    screen.getByRole('group');
    expect(screen.getByRole('group')).toHaveClass(className);
    expect(screen.getByRole('group')).toHaveClass('propertyFieldset');
  });

  it('Forwards the ref object to the fieldset element if given', () => {
    const ref = createRef<HTMLFieldSetElement>();
    render(<StudioPropertyFieldset legend='Test' ref={ref} />);
    expect(ref.current).toBe(screen.getByRole('group'));
  });

  it('Renders a compact fieldset when the compact prop is true', () => {
    render(<StudioPropertyFieldset legend='Test' compact />);
    expect(screen.getByRole('group')).toHaveClass('compact');
  });
});
