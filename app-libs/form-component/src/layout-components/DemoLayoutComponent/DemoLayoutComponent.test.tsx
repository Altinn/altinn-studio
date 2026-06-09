import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';

import { DemoLayoutComponent } from './DemoLayoutComponent';

describe('DemoLayoutComponent', () => {
  it('defaults to English translations', () => {
    renderWithTranslations(<DemoLayoutComponent />);

    // 'helptext.button_title' translates to 'Help' in en.ts
    expect(
      screen.getByText(/The key helptext.button_title is translated as: Help/),
    ).toBeInTheDocument();
  });

  it('uses the translations for the given language', () => {
    renderWithTranslations(<DemoLayoutComponent />, { language: 'nb' });

    // 'helptext.button_title' translates to 'Hjelp' in nb.ts
    expect(
      screen.getByText(/The key helptext.button_title is translated as: Hjelp/),
    ).toBeInTheDocument();
  });
});
