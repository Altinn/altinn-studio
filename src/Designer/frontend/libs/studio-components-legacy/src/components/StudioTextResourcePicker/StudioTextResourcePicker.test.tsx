import type { ForwardedRef } from 'react';
import React from 'react';
import { textResourcesMock } from '../../test-data/textResourcesMock';
import type { StudioTextResourcePickerProps } from './StudioTextResourcePicker';
import { StudioTextResourcePicker } from './StudioTextResourcePicker';
import type { RenderResult } from '@testing-library/react';
import { render, screen, waitFor } from '@testing-library/react';
import { testRefForwarding } from '../../test-utils/testRefForwarding';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';
import userEvent from '@testing-library/user-event';
import type { TextResource } from '../../types/TextResource';

// Test data:
const textResources = textResourcesMock;
const onValueChange = jest.fn();
const noTextResourceOptionLabel = 'Unset';
const defaultProps: StudioTextResourcePickerProps = {
  onValueChange,
  textResources,
  noTextResourceOptionLabel,
};
const arbitraryTextResourceIndex = 129;

describe('StudioTextResourcePicker', () => {
  beforeEach(jest.clearAllMocks);

  it('Renders a combobox', () => {
    renderTextResourcePicker();
    expect(getCombobox()).toBeInTheDocument();
  });

  it('Renders with the given label', () => {
    const label = 'Test label';
    renderTextResourcePicker({ label });
    expect(getCombobox()).toHaveAccessibleName(label);
  });

  it('Displays the given text resources when the user clicks', async () => {
    const user = userEvent.setup();
    const testTextResources: TextResource[] = [
      { id: '1', value: 'Test 1' },
      { id: '2', value: 'Test 2' },
    ];
    renderTextResourcePicker({ textResources: testTextResources });
    await user.click(getCombobox());
    testTextResources.forEach((textResource) => {
      const expectedName = expectedOptionName(textResource);
      expect(screen.getByRole('option', { name: expectedName })).toBeInTheDocument();
    });
  });

  it('Calls the onValueChange callback when the user picks a text resource', async () => {
    const user = userEvent.setup();
    renderTextResourcePicker();
    await user.click(getCombobox());
    const textResourceToPick = textResources[arbitraryTextResourceIndex];
    await user.click(screen.getByRole('option', { name: expectedOptionName(textResourceToPick) }));
    await waitFor(expect(onValueChange).toBeCalled);
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith(textResourceToPick.id);
  });

  it("Renders with the text of the text resource of which the ID is given by the component's value prop", () => {
    const pickedTextResource = textResources[arbitraryTextResourceIndex];
    renderTextResourcePicker({ value: pickedTextResource.id });
    expect(getCombobox()).toHaveValue(pickedTextResource.value);
  });

  it('Displays the no text resource option when the user clicks', async () => {
    const user = userEvent.setup();
    renderTextResourcePicker();
    await user.click(getCombobox());
    expect(screen.getByRole('option', { name: noTextResourceOptionLabel })).toBeInTheDocument();
  });

  it('Does not display the no text resource option when the user clicks and the text resource is required', async () => {
    const user = userEvent.setup();
    renderTextResourcePicker({ required: true });
    await user.click(getCombobox());
    const noTextResourceOption = screen.queryByRole('option', { name: noTextResourceOptionLabel });
    expect(noTextResourceOption).not.toBeInTheDocument();
  });

  it('Renders with the no text resource option selected by default', () => {
    renderTextResourcePicker();
    expect(getCombobox()).toHaveValue('');
  });

  it('Renders with no text resource option as selected when the given id does not exist', () => {
    const nonExistentId = 'non-existent-id';
    renderTextResourcePicker({ value: nonExistentId });
    expect(getCombobox()).toHaveValue('');
  });

  it('Calls the onValueChange callback with null when the user selects the unset option', async () => {
    const user = userEvent.setup();
    const value = textResources[arbitraryTextResourceIndex].id;
    renderTextResourcePicker({ value });
    await user.click(getCombobox());
    await user.click(screen.getByRole('option', { name: noTextResourceOptionLabel }));
    await waitFor(expect(onValueChange).toHaveBeenCalled);
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith(null);
  });

  it('Does not apply other changes to the textfield than the ones triggered by the user when the user changes from a valid to an invalid value', async () => {
    const user = userEvent.setup();
    const chosenTextResource = textResources[arbitraryTextResourceIndex];
    renderTextResourcePicker({ value: chosenTextResource.id });
    const combobox = getCombobox();
    await user.type(combobox, '{backspace}');
    const newExpectedValue = chosenTextResource.value.slice(0, -1);
    expect(combobox).toHaveValue(newExpectedValue);
  });

  it('Renders without error when the text props are undefined', () => {
    renderTextResourcePicker({ emptyLabel: undefined, noTextResourceOptionLabel: undefined });
    expect(getCombobox()).toBeInTheDocument();
  });

  it('Forwards the ref', () => {
    testRefForwarding<HTMLInputElement>((ref) => renderTextResourcePicker({}, ref), getCombobox);
  });

  it('Applies the class name to the root element', () => {
    testRootClassNameAppending((className) => renderTextResourcePicker({ className }));
  });

  it('Accepts additional props', () => {
    testCustomAttributes(renderTextResourcePicker, getCombobox);
  });
});

function renderTextResourcePicker(
  props: Partial<StudioTextResourcePickerProps> = {},
  ref?: ForwardedRef<HTMLInputElement>,
): RenderResult {
  return render(<StudioTextResourcePicker {...defaultProps} {...props} ref={ref} />);
}

function getCombobox(): HTMLInputElement {
  return screen.getByRole('combobox') as HTMLInputElement;
}

function expectedOptionName(textResource: TextResource): string {
  return textResource.value + ' ' + textResource.id;
}
