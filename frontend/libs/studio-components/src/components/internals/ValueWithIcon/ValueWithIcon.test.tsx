import type { RenderResult } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import type { ValueWithIconProps } from './ValueWithIcon';
import { ValueWithIcon } from './ValueWithIcon';
import type { IconPlacement } from '../../../types/IconPlacement';
import type { ForwardedRef } from 'react';
import React from 'react';
import { testRefForwarding } from '../../../test-utils/testRefForwarding';

describe('ValueWithIcon', () => {
  const iconPlacements: IconPlacement[] = ['right', 'left', undefined];

  it.each(iconPlacements)('Renders children and icon when iconPlacement is %s', (iconPlacement) => {
    const children = 'Content';
    const iconTestId = 'icon';
    const icon = <svg data-testid={iconTestId} />;
    const props: ValueWithIconProps = { icon, iconPlacement, children };
    renderValueWithIcon(props);
    expect(screen.getByText(children)).toBeInTheDocument();
    expect(screen.getByTestId(iconTestId)).toBeInTheDocument();
  });

  it('Renders children when no icon is specified', () => {
    const children = 'Content';
    const props: ValueWithIconProps = { children };
    renderValueWithIcon(props);
    expect(screen.getByText(children)).toBeInTheDocument();
  });

  it('Forwards the ref if given', () => {
    const children = 'Content';
    const icon = <svg />;
    const props: ValueWithIconProps = { icon, children };
    testRefForwarding<HTMLSpanElement>((ref) => renderValueWithIcon(props, ref));
  });
});

function renderValueWithIcon(
  props: Partial<ValueWithIconProps>,
  ref?: ForwardedRef<HTMLSpanElement>,
): RenderResult {
  return render(<ValueWithIcon {...props} ref={ref} />);
}
