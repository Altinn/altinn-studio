import { useRef, type ReactElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { useCommitPendingClear } from './useCommitPendingClear';

// The web component behind StudioSuggestion does not upgrade in jsdom, so these tests stand in for
// it with the plain markup it wraps: a root element containing the input the user types in. That
// is all the hook looks at, and it is what the hook has to keep working with — the point of the
// hook is that it does not depend on the web component to report a clear.

describe('useCommitPendingClear', () => {
  it('reports the clear when the user empties the field and moves focus out of it', () => {
    const onClear = jest.fn();
    renderField({ onClear });

    emptyField();
    fireEvent.focusOut(getInput());

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('reports the clear before a click that unmounts the field is able to remove it', () => {
    // The defect this guards against: the process editor swaps the whole configuration panel out
    // when the click changes the bpmn selection, and a clear reported any later than this is lost
    // with the element it was reported from.
    const onClear = jest.fn();
    const { unmount } = renderField({ onClear });

    emptyField();
    fireEvent.mouseDown(getOutsideElement());
    fireEvent.focusOut(getInput());

    expect(onClear).toHaveBeenCalledTimes(1);

    unmount();
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('does not report a clear while the field still holds text', () => {
    const onClear = jest.fn();
    renderField({ onClear });

    fireEvent.focusOut(getInput());

    expect(onClear).not.toHaveBeenCalled();
  });

  it('reports the clear when the field is left holding nothing but whitespace', () => {
    const onClear = jest.fn();
    renderField({ onClear });

    setFieldText('   ');
    fireEvent.focusOut(getInput());

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('does not report a clear when there is no selection to clear', () => {
    const onClear = jest.fn();
    renderField({ hasSelection: false, onClear });

    emptyField();
    fireEvent.focusOut(getInput());

    expect(onClear).not.toHaveBeenCalled();
  });

  it('does not report a clear when the press that moved the focus started inside the field', () => {
    // The clear button and the options in the list both blur the input on mousedown and hand focus
    // straight back on click, so a press inside the field is not the user leaving it.
    const onClear = jest.fn();
    renderField({ onClear });

    emptyField();
    fireEvent.mouseDown(getClearButton());
    fireEvent.focusOut(getInput());

    expect(onClear).not.toHaveBeenCalled();
  });

  it('reports the clear on the next press outside the field after one inside it', () => {
    const onClear = jest.fn();
    renderField({ onClear });

    emptyField();
    fireEvent.mouseDown(getClearButton());
    fireEvent.focusOut(getInput());
    fireEvent.mouseUp(document);

    fireEvent.mouseDown(getOutsideElement());
    fireEvent.focusOut(getInput());

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('does not report a clear when the focus moves to another element inside the field', () => {
    const onClear = jest.fn();
    renderField({ onClear });

    emptyField();
    fireEvent.focusOut(getInput(), { relatedTarget: getClearButton() });

    expect(onClear).not.toHaveBeenCalled();
  });

  it('does not report a clear when some other element loses focus', () => {
    const onClear = jest.fn();
    renderField({ onClear });

    emptyField();
    fireEvent.focusOut(getOutsideElement());

    expect(onClear).not.toHaveBeenCalled();
  });
});

const inputLabel = 'Data model';
const clearButtonLabel = 'Clear';
const outsideElementLabel = 'Canvas';

const getInput = (): HTMLInputElement => screen.getByLabelText(inputLabel);
const getClearButton = (): HTMLElement => screen.getByLabelText(clearButtonLabel);
const getOutsideElement = (): HTMLElement => screen.getByLabelText(outsideElementLabel);

function setFieldText(text: string): void {
  getInput().value = text;
}

function emptyField(): void {
  setFieldText('');
}

type FieldProps = {
  hasSelection?: boolean;
  onClear: () => void;
};

function Field({ hasSelection = true, onClear }: FieldProps): ReactElement {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useCommitPendingClear({ rootRef, inputRef, hasSelection, onClear });
  return (
    <div ref={rootRef}>
      <input aria-label={inputLabel} defaultValue='Model' ref={inputRef} />
      <button aria-label={clearButtonLabel} type='button' />
    </div>
  );
}

function renderField(props: FieldProps): ReturnType<typeof render> {
  return render(
    <>
      <Field {...props} />
      <div aria-label={outsideElementLabel} />
    </>,
  );
}
