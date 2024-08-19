import { render, screen } from '@testing-library/react';
import {
  isCaretAtEnd,
  isCaretAtFirstLine,
  isCaretAtLastLine,
  isCaretAtStart,
  isSomethingSelected,
} from './caretUtils';
import React from 'react';
import userEvent from '@testing-library/user-event';

describe('caretUtils', () => {
  describe('isCaretAtStart', () => {
    it('Returns true when the input field is empty', () => {
      renderTextarea();
      expect(isCaretAtStart(getTextarea())).toBe(true);
    });

    it('Returns false after the user has typed something', async () => {
      const user = userEvent.setup();
      renderTextarea();
      await user.type(getTextarea(), 'Hello');
      expect(isCaretAtStart(getTextarea())).toBe(false);
    });

    it('Returns true when the user has moved the caret to the start of the text', async () => {
      const user = userEvent.setup();
      renderTextarea();
      await user.type(
        getTextarea(),
        'Hello{arrowleft}{arrowleft}{arrowleft}{arrowleft}{arrowleft}',
      );
      expect(isCaretAtStart(getTextarea())).toBe(true);
    });

    it('Returns false when after the user has moved the caret to the middle of the text', async () => {
      const user = userEvent.setup();
      renderTextarea();
      await user.type(getTextarea(), 'Hello{arrowleft}{arrowleft}');
      expect(isCaretAtStart(getTextarea())).toBe(false);
    });
  });

  describe('isCaretAtEnd', () => {
    it('Returns true when the input field is empty', () => {
      renderTextarea();
      expect(isCaretAtEnd(getTextarea())).toBe(true);
    });

    it('Returns true after the user has typed something', async () => {
      const user = userEvent.setup();
      renderTextarea();
      await user.type(getTextarea(), 'Hello');
      expect(isCaretAtEnd(getTextarea())).toBe(true);
    });

    it('Returns false when the user has moved the caret to the start of the text', async () => {
      const user = userEvent.setup();
      renderTextarea();
      await user.type(
        getTextarea(),
        'Hello{arrowleft}{arrowleft}{arrowleft}{arrowleft}{arrowleft}',
      );
      expect(isCaretAtEnd(getTextarea())).toBe(false);
    });

    it('Returns false when after the user has moved the caret to the middle of the text', async () => {
      const user = userEvent.setup();
      renderTextarea();
      await user.type(getTextarea(), 'Hello{arrowleft}{arrowleft}');
      expect(isCaretAtEnd(getTextarea())).toBe(false);
    });
  });

  describe('isCaretAtFirstLine', () => {
    it('Returns true when the input field is empty', () => {
      renderTextarea();
      expect(isCaretAtFirstLine(getTextarea())).toBe(true);
    });

    it('Returns true when the user types a single line of text', async () => {
      const user = userEvent.setup();
      renderTextarea();
      await user.type(getTextarea(), 'Hello');
      expect(isCaretAtFirstLine(getTextarea())).toBe(true);
    });

    it('Returns false when the user types a several lines of text', async () => {
      const user = userEvent.setup();
      renderTextarea();
      await user.type(getTextarea(), 'Hello\nWorld');
      expect(isCaretAtFirstLine(getTextarea())).toBe(false);
    });

    it('Returns true when the user types a several lines of text and moves the caret to the first line', async () => {
      const user = userEvent.setup();
      renderTextarea();
      await user.type(
        getTextarea(),
        'Hello\nWorld{arrowleft}{arrowleft}{arrowleft}{arrowleft}{arrowleft}{arrowleft}',
      );
      expect(isCaretAtFirstLine(getTextarea())).toBe(true);
    });
  });

  describe('isCaretAtLastLine', () => {
    it('Returns true when the input field is empty', () => {
      renderTextarea();
      expect(isCaretAtLastLine(getTextarea())).toBe(true);
    });

    it('Returns true when the user types a single line of text', async () => {
      const user = userEvent.setup();
      renderTextarea();
      await user.type(getTextarea(), 'Hello');
      expect(isCaretAtLastLine(getTextarea())).toBe(true);
    });

    it('Returns true when the user types a several lines of text', async () => {
      const user = userEvent.setup();
      renderTextarea();
      await user.type(getTextarea(), 'Hello\nWorld');
      expect(isCaretAtLastLine(getTextarea())).toBe(true);
    });

    it('Returns false when the user types a several lines of text and moves the caret to the first line', async () => {
      const user = userEvent.setup();
      renderTextarea();
      await user.type(
        getTextarea(),
        'Hello\nWorld{arrowleft}{arrowleft}{arrowleft}{arrowleft}{arrowleft}{arrowleft}',
      );
      expect(isCaretAtLastLine(getTextarea())).toBe(false);
    });
  });

  describe('isSomethingSelected', () => {
    it('Returns false when the input field is empty', () => {
      renderTextarea();
      expect(isSomethingSelected(getTextarea())).toBe(false);
    });

    it('Returns false when the user types something', async () => {
      const user = userEvent.setup();
      renderTextarea();
      await user.type(getTextarea(), 'Hello');
      expect(isSomethingSelected(getTextarea())).toBe(false);
    });

    it('Returns true when something is selected', async () => {
      renderTextarea('Hello');
      getTextarea().setSelectionRange(0, 3);
      expect(isSomethingSelected(getTextarea())).toBe(true);
    });
  });
});

function renderTextarea(value: string = '') {
  return render(<textarea defaultValue={value} />);
}

const getTextarea = (): HTMLTextAreaElement => screen.getByRole('textbox');
