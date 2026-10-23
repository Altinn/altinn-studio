import { describe, expect, it, vi } from 'vitest';
import type { RenderResult } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudioCallToActionBar, type StudioCallToActionBarProps } from './StudioCallToActionBar';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';

describe('StudioCallToActionBar', () => {
  it('Sets the given className on the action container', () => {
    testRootClassNameAppending((className) =>
      renderComponent({ className, isVisible: true, title: 'CTA Title', onClick: vi.fn() }),
    );
  });

  it('Appends custom attributes to the root element', () => {
    testCustomAttributes((props) =>
      renderComponent({ ...props, isVisible: true, title: 'CTA Title', onClick: vi.fn() }),
    );
  });

  it('Renders children', () => {
    renderComponent();
    expect(screen.getByText(childText)).toBeInTheDocument();
  });

  it('Displays the title as the button title attribute', () => {
    renderComponent();
    const button = screen.getByRole('button', { name: title });
    expect(button).toHaveAttribute('title', title);
  });

  it('Fires onClick when the button is clicked', async () => {
    const user = userEvent.setup();
    const onActionButtonClickedMock = vi.fn();
    renderComponent({ onClick: onActionButtonClickedMock });

    const button = screen.getByRole('button', { name: title });
    await user.click(button);

    expect(onActionButtonClickedMock).toHaveBeenCalledTimes(1);
  });

  it('Places the action bar below the children by default', () => {
    renderComponent({ isVisible: true });
    expect(getActionContainer()).not.toHaveClass('top');
  });

  it('Places the action bar above the children when placement is top', () => {
    renderComponent({ isVisible: true, placement: 'top' });
    expect(getActionContainer()).toHaveClass('top');
  });
});

const childText = 'Child content';
const title = 'Add Item';

function renderComponent(props: Partial<StudioCallToActionBarProps> = {}): RenderResult {
  return render(
    <StudioCallToActionBar isVisible={false} title={title} onClick={() => {}} {...props}>
      {childText}
    </StudioCallToActionBar>,
  );
}

function getActionContainer(): HTMLElement {
  return screen.getByRole('button', { name: title }).parentElement;
}
