import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';

import { DemoLayoutComponent } from './DemoLayoutComponent';

describe('DemoLayoutComponent', () => {
  it('defaults to English translations', () => {
    renderWithTranslations(<DemoLayoutComponent content='' />);

    // 'helptext.button_title' translates to 'Help' in en.ts
    expect(
      screen.getByText(/The static text with key helptext\.button_title is translated as: Help/),
    ).toBeInTheDocument();
  });

  it('uses the translations for the given language', () => {
    renderWithTranslations(<DemoLayoutComponent content='' />, { language: 'nb' });

    // 'helptext.button_title' translates to 'Hjelp' in nb.ts
    expect(
      screen.getByText(/The static text with key helptext\.button_title is translated as: Hjelp/),
    ).toBeInTheDocument();
  });

  it('renders HTML content as parsed React nodes', () => {
    renderWithTranslations(
      <DemoLayoutComponent content='<h3>Parsed heading</h3><p>Parsed paragraph</p>' />,
    );

    expect(screen.getByRole('heading', { name: 'Parsed heading' })).toBeInTheDocument();
    expect(screen.getByText('Parsed paragraph')).toBeInTheDocument();
  });

  it('renders markdown content as parsed React nodes', () => {
    renderWithTranslations(
      <DemoLayoutComponent content={'# Markdown heading\n\n- First item\n- Second item'} />,
    );

    expect(screen.getByRole('heading', { name: 'Markdown heading' })).toBeInTheDocument();
    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(2);
    expect(listItems[0]).toHaveTextContent('First item');
    expect(listItems[1]).toHaveTextContent('Second item');
  });
});
