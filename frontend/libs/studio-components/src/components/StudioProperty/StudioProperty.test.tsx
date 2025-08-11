import type { RenderResult } from '@testing-library/react';
import { act, render, screen } from '@testing-library/react';
import { ComposedComponent } from './test-data/ComposedComponent';
import React from 'react';
import { buttons } from './test-data/buttons';
import { userEvent } from 'storybook/test';
import type { UserEvent } from '@testing-library/user-event';

describe('StudioProperty composition', () => {
  it('Renders the buttons', () => {
    renderComposition();
    buttons.forEach((button) => {
      expect(screen.getByRole('button', { name: button.property })).toBeInTheDocument();
    });
  });

  it('Renders a fieldset when the user clicks a button', async () => {
    const user = userEvent.setup();
    renderComposition();
    await openFirstProperty(user);
    expect(screen.getByRole('group', { name: buttons[0].property })).toBeInTheDocument();
  });

  it('Closes the fieldset when the user clicks the "Close" button', async () => {
    const user = userEvent.setup();
    renderComposition();
    await openFirstProperty(user);
    await act(() => user.click(screen.getByRole('button', { name: 'Close' })));
    expect(screen.queryByRole('group', { name: buttons[0].property })).not.toBeInTheDocument();
  });

  it('Updates the data when the user changes a value', async () => {
    const user = userEvent.setup();
    renderComposition();
    await openFirstProperty(user);
    const input = screen.getByRole('textbox');
    const additonalText = 'additional text';
    await act(() => user.type(input, additonalText));
    expect(input).toHaveValue(buttons[0].value + additonalText);
  });
});

function renderComposition(): RenderResult {
  return render(<ComposedComponent buttons={buttons} />);
}

async function openFirstProperty(user: UserEvent): Promise<void> {
  await act(() => user.click(screen.getByRole('button', { name: buttons[0].property })));
}
