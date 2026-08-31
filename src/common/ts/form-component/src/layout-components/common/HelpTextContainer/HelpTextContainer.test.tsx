import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { HelpTextContainer } from './HelpTextContainer';
import type { IHelpTextContainerProps } from './HelpTextContainer';

describe('HelpTextContainer', () => {
  const render = (props?: Partial<IHelpTextContainerProps>) =>
    renderWithTranslations(
      <HelpTextContainer id='test-id' helpText='Help text content' {...props} />,
    );

  it('uses the default accessible title when no title is given', () => {
    render();

    // 'helptext.button_title' translates to 'Help' in en.ts
    expect(screen.getByRole('button', { name: /^Help$/i })).toBeInTheDocument();
  });

  it('prefixes the given title for the accessible name', () => {
    render({ title: 'My labelname' });

    // 'helptext.button_title_prefix' translates to 'Helptext for' in en.ts
    expect(screen.getByRole('button', { name: /Helptext for My labelname/i })).toBeInTheDocument();
  });

  it('renders the help text content inside the popover when opened', async () => {
    const user = userEvent.setup();
    render({ helpText: 'Some helpful explanation' });

    await user.click(screen.getByRole('button'));

    expect(screen.getByText('Some helpful explanation')).toBeInTheDocument();
  });
});
