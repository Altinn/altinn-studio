import { renderWithTranslations } from '@app/form-component/test/renderWithTranslations';
import { screen } from '@testing-library/react';

import { DemoLayoutComponent } from './DemoLayoutComponent';

describe('DemoLayoutComponent', () => {
  it('defaults to English translations', () => {
    renderWithTranslations(<DemoLayoutComponent id='demo' content='' />);

    // 'helptext.button_title' translates to 'Help' in en.ts
    expect(
      screen.getByText(/The static text with key helptext\.button_title is translated as: Help/),
    ).toBeInTheDocument();
    expect(screen.getByText(/The current language is: en/)).toBeInTheDocument();
  });

  it('uses the translations for the given language', () => {
    renderWithTranslations(<DemoLayoutComponent id='demo' content='' />, { language: 'nb' });

    // 'helptext.button_title' translates to 'Hjelp' in nb.ts
    expect(
      screen.getByText(/The static text with key helptext\.button_title is translated as: Hjelp/),
    ).toBeInTheDocument();
    expect(screen.getByText(/The current language is: nb/)).toBeInTheDocument();
  });

  it('renders HTML content as parsed React nodes', () => {
    renderWithTranslations(
      <DemoLayoutComponent id='demo' content='<h3>Parsed heading</h3><p>Parsed paragraph</p>' />,
    );

    expect(screen.getByRole('heading', { name: 'Parsed heading' })).toBeInTheDocument();
    expect(screen.getByText('Parsed paragraph')).toBeInTheDocument();
  });

  it('renders markdown content as parsed React nodes', () => {
    renderWithTranslations(
      <DemoLayoutComponent
        id='demo'
        content={'# Markdown heading\n\n- First item\n- Second item'}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Markdown heading' })).toBeInTheDocument();
    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(2);
    expect(listItems[0]).toHaveTextContent('First item');
    expect(listItems[1]).toHaveTextContent('Second item');
  });

  it('renders the configurable title and the runtime-bound value', () => {
    renderWithTranslations(
      <DemoLayoutComponent id='demo' title='A heading' content='' dataValue='from runtime' />,
    );

    expect(screen.getByRole('heading', { name: 'A heading' })).toBeInTheDocument();
    expect(screen.getByText(/Runtime-bound value: from runtime/)).toBeInTheDocument();
  });

  it('suppresses the title when rendered in a table', () => {
    renderWithTranslations(
      <DemoLayoutComponent id='demo' title='A heading' content='' renderedInTable />,
    );

    expect(screen.queryByRole('heading', { name: 'A heading' })).not.toBeInTheDocument();
  });

  it('hides the configurable language info line when disabled', () => {
    renderWithTranslations(<DemoLayoutComponent id='demo' content='' showLanguageInfo={false} />);

    expect(screen.queryByText(/The current language is:/)).not.toBeInTheDocument();
  });

  it('renders nothing when hidden by the runtime', () => {
    const { container } = renderWithTranslations(
      <DemoLayoutComponent id='demo' content='visible?' hidden />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
