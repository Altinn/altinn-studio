import { StaticLanguageTranslatorProvider } from '@app/form-component/test/StaticLanguageTranslatorProvider';
import { render, screen } from '@testing-library/react';

import { DemoLayoutComponent } from './DemoLayoutComponent';

describe('DemoLayoutComponent', () => {
  it('defaults to English translations', () => {
    render(
      <StaticLanguageTranslatorProvider>
        <DemoLayoutComponent />
      </StaticLanguageTranslatorProvider>,
    );

    // 'helptext.button_title' translates to 'Help' in en.ts
    expect(
      screen.getByText(/The key helptext.button_title is translated as: Help/),
    ).toBeInTheDocument();
  });

  it('uses the translations for the given language', () => {
    render(
      <StaticLanguageTranslatorProvider language='nb'>
        <DemoLayoutComponent />
      </StaticLanguageTranslatorProvider>,
    );

    // 'helptext.button_title' translates to 'Hjelp' in nb.ts
    expect(
      screen.getByText(/The key helptext.button_title is translated as: Hjelp/),
    ).toBeInTheDocument();
  });
});
