import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { StudioPropertyFieldset } from './StudioPropertyFieldset';
import { testRootClassNameAppending } from '../../../test-utils/testRootClassNameAppending';
import { testRefForwarding } from '../../../test-utils/testRefForwarding';
import { FieldsetContent } from './test-data/FieldsetContent';

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
    getGroupByName(legend);
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
    testRootClassNameAppending(function (className) {
      return render(<StudioPropertyFieldset legend='Test' className={className} />);
    });
  });

  it('Forwards the ref object to the fieldset element if given', () => {
    testRefForwarding<HTMLFieldSetElement>(
      (ref) => render(<StudioPropertyFieldset legend='Test' ref={ref} />),
      getGroup,
    );
  });

  it('Renders a compact fieldset when the compact prop is true', () => {
    render(<StudioPropertyFieldset legend='Test' compact />);
    expect(getGroup()).toHaveClass('compact');
  });

  it('Renders children', () => {
    render(
      <StudioPropertyFieldset legend='Test'>
        <FieldsetContent />
      </StudioPropertyFieldset>,
    );
    expect(within(getGroup()).getByRole('textbox', { name: 'Name' })).toBeInTheDocument();
    expect(within(getGroup()).getByRole('textbox', { name: 'Address' })).toBeInTheDocument();
  });
});

const getGroup = (): HTMLFieldSetElement => screen.getByRole('group');
const getGroupByName = (name: string): HTMLFieldSetElement => screen.getByRole('group', { name });
