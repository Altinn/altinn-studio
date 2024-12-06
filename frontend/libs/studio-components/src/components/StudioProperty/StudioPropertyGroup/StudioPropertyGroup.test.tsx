import React from 'react';
import { render, screen } from '@testing-library/react';
import { StudioPropertyGroup } from './StudioPropertyGroup';
import { testRefForwarding } from '../../../test-utils/testRefForwarding';
import { testRootClassNameAppending } from '../../../test-utils/testRootClassNameAppending';

jest.mock('./StudioPropertyGroup.module.css', () => ({
  listWrapper: 'listWrapper',
}));

describe('StudioPropertyGroup', () => {
  it('Renders children', () => {
    const content = 'Test';
    render(<StudioPropertyGroup>Test</StudioPropertyGroup>);
    screen.getByText(content);
  });

  it('Appends the given class name', () => {
    testRootClassNameAppending((cn) => render(<StudioPropertyGroup className={cn} />));
  });

  it('Forwards the ref object if given', () => {
    const testId = 'test-id';
    testRefForwarding<HTMLDivElement>(
      (ref) => render(<StudioPropertyGroup ref={ref} data-testid={testId} />),
      () => screen.getByTestId(testId),
    );
  });
});
