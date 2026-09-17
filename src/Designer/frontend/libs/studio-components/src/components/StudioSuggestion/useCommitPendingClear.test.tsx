import type { ReactElement } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { useCommitPendingClear } from './useCommitPendingClear';

// The web component does not upgrade in jsdom, so a plain root holding the input stands in for it.

describe('useCommitPendingClear', () => {
  it('reports the clear when the user empties the field and moves focus out of it', () => {
    const onClear = jest.fn();
    renderField({ onClear });

    emptyField();
    fireEvent.mouseDown(getOutsideElement());
    fireEvent.focusOut(getInput());

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
    // The clear button and the options blur the input on mousedown and hand focus back on click.
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
  const commitPendingClear = useCommitPendingClear({ hasSelection, onClear });
  return (
    <div {...commitPendingClear}>
      <input aria-label={inputLabel} defaultValue='Model' />
      <button aria-label={clearButtonLabel} type='button' />
    </div>
  );
}

function renderField(props: FieldProps): void {
  render(
    <>
      <Field {...props} />
      <div aria-label={outsideElementLabel} />
    </>,
  );
}
