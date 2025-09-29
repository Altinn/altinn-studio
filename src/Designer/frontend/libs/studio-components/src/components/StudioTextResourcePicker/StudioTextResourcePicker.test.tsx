import type { ForwardedRef } from 'react';
import React from 'react';
import { textResourcesMock } from '../../test-data/textResourcesMock';
import type { StudioTextResourcePickerProps } from './StudioTextResourcePicker';
import { StudioTextResourcePicker } from './StudioTextResourcePicker';
import type { RenderResult } from '@testing-library/react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { testRefForwarding } from '../../test-utils/testRefForwarding';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';
import { getFirstBySelector } from '../../test-utils/selectors';
import userEvent from '@testing-library/user-event';
import type { TextResource } from '../../../../studio-pure-functions/src/types/TextResource';

// Test data:
const textResources = textResourcesMock;
const onValueChange = jest.fn();
const noTextResourceOptionLabel = 'Unset';
const defaultProps: StudioTextResourcePickerProps = {
  onValueChange,
  textResources,
  noTextResourceOptionLabel,
  emptyText: '',
  label: 'Text Resource',
};
const arbitraryTextResourceIndex = 129;
const textSelector = '.ds-chip';
const textMissingValueId = 'missing-value-id';

describe('StudioTextResourcePicker', () => {
  beforeEach(jest.clearAllMocks);

  it('Renders a studio suggestion', () => {
    renderTextResourcePicker();
  });

  it('Renders with the given label', () => {
    const label = 'Test label';
    renderTextResourcePicker({ label });
    expect(getInput()).toHaveAccessibleName(label);
  });

  it('Displays the given text resources when the user clicks', async () => {
    const user = userEvent.setup();
    const testTextResources: TextResource[] = [
      { id: '1', value: 'Test 1' },
      { id: '2', value: 'Test 2' },
    ];
    renderTextResourcePicker({ textResources: testTextResources });
    await user.click(getInput());
    testTextResources.forEach((textResource) => {
      const expectedName = expectedOptionName(textResource);
      expect(screen.getByRole('option', { name: expectedName })).toBeInTheDocument();
    });
  });

  it('Calls the onValueChange when the user picks a text resource', async () => {
    const user = userEvent.setup();
    renderTextResourcePicker();
    await user.click(getInput());
    const textResourceToPick = textResources[arbitraryTextResourceIndex];
    await user.click(screen.getByRole('option', { name: expectedOptionName(textResourceToPick) }));
    await waitFor(expect(onValueChange).toBeCalled);
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith(textResourceToPick.id);
  });

  it("Renders with the text of the text resource of which the ID is given by the component's value prop", () => {
    const pickedTextResource = textResources[arbitraryTextResourceIndex];
    renderTextResourcePicker({ value: pickedTextResource.id });
    const text = screen.getByText(pickedTextResource.value, { selector: textSelector });
    expect(text).toBeInTheDocument();
    expect(text).toHaveAttribute('value', pickedTextResource.id);
  });

  it('Displays the no text resource option when the user clicks', async () => {
    const user = userEvent.setup();
    renderTextResourcePicker();
    await user.click(getInput());
    const listbox = screen.getByRole('listbox');
    const options = within(listbox).getAllByRole('option');
    expect(options.some((opt) => opt.getAttribute('value') === '')).toBe(true);
  });

  it('Does not display the no text resource option when the user clicks and the text resource is required', async () => {
    const user = userEvent.setup();
    renderTextResourcePicker({ required: true });
    await user.click(getInput());
    const noTextResourceOption = screen.queryByRole('option', { name: noTextResourceOptionLabel });
    expect(noTextResourceOption).not.toBeInTheDocument();
  });

  it('Renders with the no text resource option selected by default', () => {
    renderTextResourcePicker();
    expect(getInput()).toHaveValue('');
  });

  it('Renders with no text resource option as selected when the given id does not exist', () => {
    const nonExistentId = 'non-existent-id';
    renderTextResourcePicker({ value: nonExistentId });
    expect(getInput()).toHaveValue('');
  });

  it('Does not apply other changes to the textfield than the ones triggered by the user when the user changes from a valid to an invalid value', async () => {
    const user = userEvent.setup();
    const chosenTextResource = textResources[arbitraryTextResourceIndex];
    renderTextResourcePicker({ value: chosenTextResource.id });
    const textBox = getInput();
    await user.click(textBox);
    const before = (textBox as HTMLInputElement).value;
    await user.type(textBox, 'x');
    expect(textBox).toHaveValue(before + 'x');
    (textBox as HTMLInputElement).setSelectionRange(
      (textBox as HTMLInputElement).value.length,
      (textBox as HTMLInputElement).value.length,
    );
    await user.keyboard('{Backspace}');
    await waitFor(() => expect(textBox).toHaveValue(before));
  });

  it('Renders without error when the text props are undefined', () => {
    renderTextResourcePicker({ emptyLabel: undefined, noTextResourceOptionLabel: undefined });
    expect(getInput()).toBeInTheDocument();
  });

  it('Forwards the ref', () => {
    testRefForwarding<HTMLInputElement>((ref) => renderTextResourcePicker({}, ref), getInput);
  });

  it('Applies the class name to the root element', () => {
    testRootClassNameAppending((className) => renderTextResourcePicker({ className }));
  });

  it('Accepts additional props', () => {
    const getRoot = (container: HTMLElement): HTMLElement =>
      getFirstBySelector(container, '.ds-suggestion');
    testCustomAttributes(renderTextResourcePicker, getRoot);
  });

  it('Calls onValueChange with null when selection is cleared', async () => {
    const user = userEvent.setup();
    const pickedTextResource = textResources[arbitraryTextResourceIndex];
    renderTextResourcePicker({ value: pickedTextResource.id });
    const removableChip = screen.getByText(pickedTextResource.value, {
      selector: textSelector,
    });
    await user.click(removableChip);
    await waitFor(() => expect(onValueChange).toHaveBeenCalledWith(null));
  });

  it('Displays the ID as label when text resource value is not found', () => {
    const textResourcesWithMissingValue: TextResource[] = [
      { id: 'test-id', value: 'Test Value' },
      { id: textMissingValueId } as TextResource,
    ];
    renderTextResourcePicker({
      textResources: textResourcesWithMissingValue,
      value: textMissingValueId,
    });
    const text = screen.getByText(textMissingValueId, { selector: textSelector });
    expect(text).toBeInTheDocument();
  });
});

function renderTextResourcePicker(
  props: Partial<StudioTextResourcePickerProps> = {},
  ref?: ForwardedRef<HTMLInputElement>,
): RenderResult {
  return render(<StudioTextResourcePicker {...defaultProps} {...props} ref={ref} />);
}

function getInput(): HTMLInputElement {
  return screen.getByRole('textbox') as HTMLInputElement;
}

function expectedOptionName(textResource: TextResource): string {
  return textResource.value + ' ' + textResource.id;
}
