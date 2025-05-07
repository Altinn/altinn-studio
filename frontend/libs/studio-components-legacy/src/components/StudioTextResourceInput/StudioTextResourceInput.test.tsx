import type { ForwardedRef } from 'react';
import React from 'react';
import type { StudioTextResourceInputProps } from './StudioTextResourceInput';
import { StudioTextResourceInput } from './StudioTextResourceInput';
import type { RenderResult } from '@testing-library/react';
import { render, screen, waitFor } from '@testing-library/react';
import type { TextResourceInputTexts } from './types/TextResourceInputTexts';
import type { TextResource } from '../../types/TextResource';
import { textResourcesMock } from '../../test-data/textResourcesMock';
import type { UserEvent } from '@testing-library/user-event';
import { userEvent } from '@testing-library/user-event';
import { getTextResourceById } from './utils';
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
const onUpdateTextResource = jest.fn();
const onChangeCurrentId = jest.fn();
const onChangeTextResource = jest.fn();
const onCreateTextResource = jest.fn();
const defaultProps: StudioTextResourceInputProps = {
  textResources,
  texts,
  onUpdateTextResource,
  onChangeCurrentId,
  onChangeTextResource,
  onCreateTextResource,
  currentId,
};
const currentTextResource = getTextResourceById(textResources, currentId);

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
    const newValue = currentTextResource.value + additionalText;
    await user.type(getValueField(), additionalText);
    expect(onChangeTextResource).toHaveBeenCalledTimes(1);
    expect(onChangeTextResource).toHaveBeenCalledWith({ ...currentTextResource, value: newValue });
  });

  it('Calls the onUpdateTextResource callback with the updated text resource when the field is blurred', async () => {
    const user = userEvent.setup();
    renderTextResourceInput();
    const additionalText = 'abc';
    const newValue = currentTextResource.value + additionalText;
    await user.type(getValueField(), additionalText);
    await user.tab();
    expect(onUpdateTextResource).toHaveBeenCalledTimes(1);
    expect(onUpdateTextResource).toHaveBeenCalledWith({ ...currentTextResource, value: newValue });
  });

  it('Calls the onCreateTextResource callback when current id is undefined and the field is blurred', async () => {
    const user = userEvent.setup();
    renderTextResourceInput({ currentId: undefined });
    const text = 'a test text';
    await user.type(getValueField(), text);
    await user.tab();
    expect(onCreateTextResource).toBeCalledTimes(1);
    expect(onCreateTextResource).toHaveBeenCalledWith({
      id: expect.any(String),
      value: text,
    });
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
    await user.click(getTextResourcePicker());
    await user.click(screen.getByRole('option', { name: optionName(newResource) }));
    await waitFor(expect(onChangeCurrentId).toHaveBeenCalled);

    expect(onChangeCurrentId).toHaveBeenCalledTimes(1);
    expect(onChangeCurrentId).toHaveBeenCalledWith(newResource.id);
  });

  it('Calls the onChangeCurrentId callback with null when a the user selects to not connect a text resource', async () => {
    const user = userEvent.setup();
    renderTextResourceInput();

    await switchToSearchMode(user);
    await user.click(getTextResourcePicker());
    await user.click(screen.getByRole('option', { name: texts.noTextResourceOptionLabel }));
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
    expect(screen.getByText(currentId)).toBeInTheDocument();
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

function optionName({ value, id }: TextResource): string {
  return value + ' ' + id;
}
