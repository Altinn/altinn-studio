import React from 'react';
import type { Ref } from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import type {
  HeaderButtonAsButtonProps,
  HeaderButtonAsLinkProps,
  StudioPageHeaderHeaderButtonProps,
} from './StudioPageHeaderHeaderButton';
import { StudioPageHeaderHeaderButton } from './StudioPageHeaderHeaderButton';
import userEvent from '@testing-library/user-event';
import type { StudioPageHeaderColor } from '../types/StudioPageHeaderColor';
import type { StudioPageHeaderVariant } from '../types/StudioPageHeaderVariant';
import { testRefForwarding } from '../../../test-utils/testRefForwarding';
import { testCustomAttributes } from '../../../test-utils/testCustomAttributes';
import { testRootClassNameAppending } from '../../../test-utils/testRootClassNameAppending';

const color: StudioPageHeaderColor = 'dark';
const variant: StudioPageHeaderVariant = 'regular';
const children: string = 'Button';
const href: string = '/test';
const defaultButtonProps: StudioPageHeaderHeaderButtonProps = {
  color,
  variant,
  asLink: false,
  children,
};
const defaultLinkProps: StudioPageHeaderHeaderButtonProps = {
  color,
  variant,
  asLink: true,
  href,
  children,
};

describe('StudioPageHeaderHeaderButton', () => {
  describe('when rendered as a button', () => {
    it('passes the colour and variant classes', () => {
      renderButtonComponent();
      const button = getButton();
      expect(button).toHaveClass(color);
      expect(button).toHaveClass(variant);
    });

    it('forwards the ref', () => {
      testRefForwarding<HTMLButtonElement>((ref) => renderButtonComponent({}, ref), getButton);
    });

    it('calls onClick when clicked', async () => {
      const user = userEvent.setup();
      const mockOnClick = jest.fn();
      renderButtonComponent({ onClick: mockOnClick });

      const button = getButton();
      await user.click(button);

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('Appends custom attributes to the button element', () => {
      testCustomAttributes(renderButtonComponent);
    });

    it('Appends given classname to internal classname', () => {
      testRootClassNameAppending((className) => renderButtonComponent({ className }));
    });
  });

  describe('when rendered as a link', () => {
    it('renders an anchor element with the correct classes', () => {
      renderLinkComponent();
      const link = getLink();

      expect(link).toHaveAttribute('href', href);
      expect(link).toHaveClass(color);
      expect(link).toHaveClass(variant);
    });

    it('forwards the ref', () => {
      testRefForwarding<HTMLAnchorElement>((ref) => renderLinkComponent({}, ref), getLink);
    });

    it('Appends custom attributes to the link element', () => {
      testCustomAttributes(renderLinkComponent);
    });

    it('Appends given classname to internal classname', () => {
      testRootClassNameAppending((className) => renderLinkComponent({ className }));
    });
  });
});

const renderButtonComponent = (
  props: Partial<HeaderButtonAsButtonProps> = {},
  ref?: Ref<HTMLButtonElement>,
): RenderResult => {
  return render(<StudioPageHeaderHeaderButton ref={ref} {...defaultButtonProps} {...props} />);
};

const renderLinkComponent = (
  props: Partial<HeaderButtonAsLinkProps> = {},
  ref?: Ref<HTMLAnchorElement>,
): RenderResult => {
  return render(<StudioPageHeaderHeaderButton ref={ref} {...defaultLinkProps} {...props} />);
};

const getButton = (): HTMLButtonElement => screen.getByRole('button', { name: children });
const getLink = (): HTMLAnchorElement => screen.getByRole('link', { name: children });
