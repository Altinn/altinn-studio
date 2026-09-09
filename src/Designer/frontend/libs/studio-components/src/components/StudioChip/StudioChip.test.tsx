import type { ForwardedRef } from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudioChip } from './';
import type {
  StudioChipButtonProps,
  StudioChipCheckboxProps,
  StudioChipRadioProps,
  StudioChipRemovableProps,
} from './';
import { getFirstBySelector } from '../../test-utils/selectors';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';
import { testRefForwarding } from '../../test-utils/testRefForwarding';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';

const label: string = 'Norwegian';

describe('StudioChip', () => {
  describe('StudioChip.Button', () => {
    it('Renders a button with the given label', () => {
      renderButton();
      expect(getButton()).toBeInTheDocument();
    });

    it('Calls the onClick callback when the user clicks the chip', async () => {
      const user = userEvent.setup();
      const onClick = jest.fn();
      renderButton({ onClick });
      await user.click(getButton());
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('Appends given classname to internal classname', () => {
      testRootClassNameAppending((className) => renderButton({ className }));
    });

    it('Appends custom attributes to the button element', () => {
      testCustomAttributes<HTMLButtonElement, StudioChipButtonProps>(renderButton);
    });

    it('Supports forwarding the ref', () => {
      testRefForwarding<HTMLButtonElement>((ref) => renderButton({}, ref));
    });
  });

  describe('StudioChip.Removable', () => {
    it('Renders a removable button with the given label', () => {
      renderRemovable();
      expect(getButton()).toHaveAttribute('data-removable', 'true');
    });

    it('Calls the onClick callback when the user clicks the chip', async () => {
      const user = userEvent.setup();
      const onClick = jest.fn();
      renderRemovable({ onClick });
      await user.click(getButton());
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('Appends given classname to internal classname', () => {
      testRootClassNameAppending((className) => renderRemovable({ className }));
    });

    it('Appends custom attributes to the button element', () => {
      testCustomAttributes<HTMLButtonElement, StudioChipRemovableProps>(renderRemovable);
    });

    it('Supports forwarding the ref', () => {
      testRefForwarding<HTMLButtonElement>((ref) => renderRemovable({}, ref));
    });
  });

  describe('StudioChip.Checkbox', () => {
    it('Renders a checkbox with the given label', () => {
      renderCheckbox();
      expect(getCheckbox()).toBeInTheDocument();
    });

    it('Reflects the checked state', () => {
      renderCheckbox({ checked: true, onChange: jest.fn() });
      expect(getCheckbox()).toBeChecked();
    });

    it('Calls the onChange callback when the user clicks the chip', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      renderCheckbox({ onChange });
      await user.click(getCheckbox());
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('Appends given classname to internal classname', () => {
      testRootClassNameAppending((className) => renderCheckbox({ className }));
    });

    it('Appends custom attributes to the input element', () => {
      testCustomAttributes<HTMLInputElement, StudioChipCheckboxProps>(renderCheckbox, getInput);
    });

    it('Supports forwarding the ref', () => {
      testRefForwarding<HTMLLabelElement>((ref) => renderCheckbox({}, ref));
    });
  });

  describe('StudioChip.Radio', () => {
    it('Renders a radio button with the given label', () => {
      renderRadio();
      expect(getRadio()).toBeInTheDocument();
    });

    it('Reflects the checked state', () => {
      renderRadio({ checked: true, onChange: jest.fn() });
      expect(getRadio()).toBeChecked();
    });

    it('Calls the onChange callback when the user clicks the chip', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      renderRadio({ onChange });
      await user.click(getRadio());
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('Appends given classname to internal classname', () => {
      testRootClassNameAppending((className) => renderRadio({ className }));
    });

    it('Appends custom attributes to the input element', () => {
      testCustomAttributes<HTMLInputElement, StudioChipRadioProps>(renderRadio, getInput);
    });

    it('Supports forwarding the ref', () => {
      testRefForwarding<HTMLLabelElement>((ref) => renderRadio({}, ref));
    });
  });
});

const renderButton = (
  props: Partial<StudioChipButtonProps> = {},
  ref?: ForwardedRef<HTMLButtonElement>,
): RenderResult =>
  render(
    <StudioChip.Button {...props} ref={ref}>
      {label}
    </StudioChip.Button>,
  );

const renderRemovable = (
  props: Partial<StudioChipRemovableProps> = {},
  ref?: ForwardedRef<HTMLButtonElement>,
): RenderResult =>
  render(
    <StudioChip.Removable {...props} ref={ref}>
      {label}
    </StudioChip.Removable>,
  );

const renderCheckbox = (
  props: Partial<StudioChipCheckboxProps> = {},
  ref?: ForwardedRef<HTMLLabelElement>,
): RenderResult =>
  render(
    <StudioChip.Checkbox {...props} ref={ref}>
      {label}
    </StudioChip.Checkbox>,
  );

const renderRadio = (
  props: Partial<StudioChipRadioProps> = {},
  ref?: ForwardedRef<HTMLLabelElement>,
): RenderResult =>
  render(
    <StudioChip.Radio {...props} ref={ref}>
      {label}
    </StudioChip.Radio>,
  );

const getButton = (): HTMLButtonElement => screen.getByRole('button', { name: label });

const getCheckbox = (): HTMLInputElement => screen.getByRole('checkbox', { name: label });

const getRadio = (): HTMLInputElement => screen.getByRole('radio', { name: label });

const getInput = (container: RenderResult['container']): HTMLInputElement =>
  getFirstBySelector<HTMLInputElement>(container, 'input');
