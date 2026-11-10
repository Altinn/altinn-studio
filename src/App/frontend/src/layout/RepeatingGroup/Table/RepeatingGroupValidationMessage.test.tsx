import React from 'react';
import { MemoryRouter } from 'react-router';

import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { parseAndCleanText } from 'src/language/sharedLanguage';
import { NavigableMessage } from 'src/layout/RepeatingGroup/Table/RepeatingGroupValidationMessage';

vi.mock('src/hooks/useNavigatePage', async (importOriginal) => ({
  ...(await importOriginal<typeof import('src/hooks/useNavigatePage')>()),
  useIsValidPageId: () => () => true,
}));
vi.mock('src/utils/layout/hidden', async (importOriginal) => ({
  ...(await importOriginal<typeof import('src/utils/layout/hidden')>()),
  useIsHiddenPage: () => false,
}));

function renderMessage(message: string) {
  const onNavigate = vi.fn();
  const result = render(
    <MemoryRouter>
      <NavigableMessage
        nodeId='field-0'
        onNavigate={onNavigate}
      >
        {parseAndCleanText(message)}
      </NavigableMessage>
    </MemoryRouter>,
  );
  return { ...result, onNavigate };
}

describe('Navigable validation messages', () => {
  it('keeps punctuation after an external link out of the tab order', async () => {
    const { onNavigate } = renderMessage('Kontroller beløpet. [Les mer](https://www.altinn.no/).');

    expect(screen.getAllByRole('button')).toHaveLength(1);
    const link = screen.getByRole('link', { name: 'Les mer' });
    expect(link).toHaveAttribute('href', 'https://www.altinn.no/');
    expect(link.closest('button')).toBeNull();
    expect(link.previousSibling?.textContent).toBe(' ');
    expect(link.nextSibling?.textContent).toBe('.');
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Kontroller beløpet.' })).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onNavigate).toHaveBeenCalledOnce();
    await userEvent.tab();
    expect(link).toHaveFocus();
    await userEvent.tab();
    expect(document.body).toHaveFocus();
  });

  it('keeps paragraph containers outside navigation buttons', () => {
    const { container } = renderMessage('Kontroller beløpet.\n\nOppgi korrekt verdi.');

    expect(container.querySelectorAll('p')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Kontroller beløpet.' }).parentElement?.tagName).toBe('P');
    expect(screen.getByRole('button', { name: 'Oppgi korrekt verdi.' }).parentElement?.tagName).toBe('P');
    expect(container.querySelector('button p')).toBeNull();
  });

  it('preserves list and list-item semantics around navigation text', () => {
    const { container } = renderMessage('- Kontroller beløpet\n- Oppgi korrekt verdi');

    expect(screen.getByRole('list')).toBeVisible();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Kontroller beløpet' }).parentElement?.tagName).toBe('LI');
    expect(screen.getByRole('button', { name: 'Oppgi korrekt verdi' }).parentElement?.tagName).toBe('LI');
    expect(container.querySelector('button ul, button li')).toBeNull();
  });

  it('groups inline formatting while keeping embedded links independently usable', async () => {
    const { onNavigate } = renderMessage('Kontroller **beløpet**. [Les mer](https://www.altinn.no/).');

    const button = screen.getByRole('button', { name: 'Kontroller beløpet.' });
    expect(button.querySelector('strong')).toHaveTextContent('beløpet');
    const link = screen.getByRole('link', { name: 'Les mer' });
    link.addEventListener('click', (event) => event.preventDefault(), { once: true });
    await userEvent.click(link);
    expect(onNavigate).not.toHaveBeenCalled();
    expect(screen.getAllByRole('button')).toHaveLength(1);
    await userEvent.click(button);
    expect(onNavigate).toHaveBeenCalledOnce();
  });

  it('preserves app-specific page links and their destination', async () => {
    const { onNavigate } = renderMessage(
      'Kontroller beløpet. <a href="/help" data-link-type="LinkToPotentialPage">Les veiledningen</a>.',
    );

    const link = screen.getByRole('link', { name: 'Les veiledningen' });
    expect(link).toHaveAttribute('href', '/help');
    expect(link.closest('button')).toBeNull();
    expect(screen.getAllByRole('button')).toHaveLength(1);
    await userEvent.click(link);
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
