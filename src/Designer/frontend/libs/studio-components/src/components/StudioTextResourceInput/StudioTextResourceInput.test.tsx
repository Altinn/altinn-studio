import type { ForwardedRef } from 'react';
import React from 'react';
import type { StudioTextResourceInputProps } from './StudioTextResourceInput';
import { StudioTextResourceInput } from './StudioTextResourceInput';
import type { RenderResult } from '@testing-library/react';
import { render, screen, waitFor } from '@testing-library/react';
import type { TextResourceInputTexts } from './types/TextResourceInputTexts';
import type { TextResource } from '../../../../studio-pure-functions/src/types/TextResource';
import { textResourcesMock } from '../../test-data/textResourcesMock';
import type { UserEvent } from '@testing-library/user-event';
import { userEvent } from '@testing-library/user-event';
import { TextResourceUtils } from '@studio/pure-functions';
import { testRefForwarding } from '../../test-utils/testRefForwarding';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';

// Test data:
const textResources: TextResource[] = textResourcesMock;
const texts: TextResourceInputTexts = {
  emptyTextResourceList: 'Ingen tekstressurser er tilgjengelige',
  editValue: 'Rediger verdi',
  idLabel: 'ID:',
  search: 'Søk',
  textResourcePickerLabel: 'Velg tekstressurs',
  noTextResourceOptionLabel: 'Ikke oppgitt',
  valueLabel: 'Tekstverdi',
};
const currentId = 'land.NO';
const onChangeCurrentId = jest.fn();
const onChangeTextResource = jest.fn();
const onCreateTextResource = jest.fn();
const onUpdateTextResource = jest.fn();
const defaultProps: StudioTextResourceInputProps = {
  textResources,
  texts,
  onChangeCurrentId,
  onChangeTextResource,
  onCreateTextResource,
  onUpdateTextResource,
  currentId,
};
const currentTextResource = TextResourceUtils.fromArray(textResources).get(currentId);

describe('StudioTextResourceInput', () => {
  afterEach(jest.clearAllMocks);

  it('Renders the "edit value" input field by default', () => {
    renderTextResourceInput();
    expect(getValueField()).toBeInTheDocument();
  });

  it('Calls the onChangeTextResource callback with the updated text resource when the value is changed', async () => {
    const user = userEvent.setup();
    renderTextResourceInput();
    const additionalText = 'a';
    const newValue = currentTextResource?.value + additionalText;
    await user.type(getValueField(), additionalText);
    expect(onChangeTextResource).toHaveBeenCalledTimes(1);
    expect(onChangeTextResource).toHaveBeenCalledWith({ ...currentTextResource, value: newValue });
  });

  it('Calls the onCreateTextResource callback when current id is undefined and the field is blurred', async () => {
    const user = userEvent.setup();
    renderTextResourceInput({ currentId: undefined });
    const text = 'a test text';
    await user.type(getValueField(), text);
    await user.tab();
    expect(onCreateTextResource).toHaveBeenCalledTimes(1);
    expect(onCreateTextResource).toHaveBeenCalledWith({
      id: expect.any(String),
      value: text,
    });
  });

  it('Does not call the onCreateTextResource callback when the field is blurred and a current id is set', async () => {
    const user = userEvent.setup();
    renderTextResourceInput();
    await user.type(getValueField(), 'abc');
    await user.tab();
    expect(onCreateTextResource).not.toHaveBeenCalled();
  });

  it('Calls the onUpdateTextResource callback with the updated text resource when the field is blurred', async () => {
    const user = userEvent.setup();
    renderTextResourceInput();
    const additionalText = 'xyz';
    const newValue = currentTextResource?.value + additionalText;
    await user.type(getValueField(), additionalText);
    await user.tab();
    expect(onUpdateTextResource).toHaveBeenCalledTimes(1);
    expect(onUpdateTextResource).toHaveBeenCalledWith({ ...currentTextResource, value: newValue });
  });

  it('Does not call the onUpdateTextResource callback when current id is undefined and the field is blurred', async () => {
    const user = userEvent.setup();
    renderTextResourceInput({ currentId: undefined });
    await user.type(getValueField(), 'some text');
    await user.tab();
    expect(onUpdateTextResource).not.toHaveBeenCalled();
  });

  it('Renders the text resource picker when the search button is clicked', async () => {
    const user = userEvent.setup();
    renderTextResourceInput();
    await switchToSearchMode(user);
    expect(getTextResourcePicker()).toBeInTheDocument();
  });

  it('Calls the onChangeCurrentId callback with the selected text resource ID when a text resource is selected', async () => {
    const user = userEvent.setup();
    const currentResource: TextResource = { id: 'current', value: 'Test 1' };
    const newResource: TextResource = { id: 'another', value: 'Test 2' };
    const textResourceList: TextResource[] = [currentResource, newResource];

    renderTextResourceInput({ textResources: textResourceList, currentId: currentResource.id });
    await switchToSearchMode(user);
    const picker = getTextResourcePicker();
    await user.clear(picker);
    await user.type(picker, newResource.value);
    const option = await screen.findByText(newResource.value);
    await user.click(option);
    await waitFor(expect(onChangeCurrentId).toHaveBeenCalled);

    expect(onChangeCurrentId).toHaveBeenCalledTimes(1);
    expect(onChangeCurrentId).toHaveBeenCalledWith(newResource.id);
  });

  it('Calls the onChangeCurrentId callback with null when a the user selects to not connect a text resource', async () => {
    const user = userEvent.setup();
    renderTextResourceInput();

    await switchToSearchMode(user);
    const chipButton = screen.getByRole('button', { name: /Press to remove/i });
    await user.click(chipButton);
    await waitFor(expect(onChangeCurrentId).toHaveBeenCalled);

    expect(onChangeCurrentId).toHaveBeenCalledTimes(1);
    expect(onChangeCurrentId).toHaveBeenCalledWith(null);
  });

  it('Renders the "edit value" input field when the user switches back from search mode', async () => {
    const user = userEvent.setup();
    renderTextResourceInput();
    await switchToSearchMode(user);
    await switchToEditMode(user);
    expect(getValueField()).toBeInTheDocument();
  });

  it('Renders the current text resource ID in "edit value" mode', () => {
    renderTextResourceInput();
    expect(screen.getByText(currentId)).toBeInTheDocument();
  });

  it('Renders the current text resource ID in "search" mode', async () => {
    const user = userEvent.setup();
    renderTextResourceInput();
    await switchToSearchMode(user);
    expect(screen.getByRole('code')).toHaveTextContent(currentId);
  });

  it('Forwards the ref if given', () => {
    testRefForwarding<HTMLInputElement>((ref) => renderTextResourceInput({}, ref), getValueField);
  });

  it('Appends the given class name to the root class', () => {
    testRootClassNameAppending((className) => renderTextResourceInput({ className }));
  });

  it('Applies additional props to the input element', () => {
    testCustomAttributes<HTMLInputElement, StudioTextResourceInputProps>(
      renderTextResourceInput,
      getValueField,
    );
  });
});

function renderTextResourceInput(
  props: Partial<StudioTextResourceInputProps> = {},
  ref?: ForwardedRef<HTMLInputElement>,
): RenderResult {
  return render(<StudioTextResourceInput {...defaultProps} {...props} ref={ref} />);
}

function getValueField(): HTMLInputElement {
  return screen.getByRole('textbox', { name: texts.valueLabel });
}

function switchToSearchMode(user: UserEvent): Promise<void> {
  return user.click(screen.getByRole('radio', { name: texts.search }));
}

function switchToEditMode(user: UserEvent): Promise<void> {
  return user.click(screen.getByRole('radio', { name: texts.editValue }));
}

function getTextResourcePicker(): HTMLInputElement {
  return screen.getByRole('combobox', { name: texts.textResourcePickerLabel });
}
