import React from 'react';

import { screen } from '@testing-library/react';

import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { getParsedLanguageFromText } from 'src/language/sharedLanguage';
import { renderWithMinimalProviders, renderWithoutInstanceAndLayout } from 'src/test/renderWithProviders';

const TestElementAsString = ({ input }: { input: string }) => {
  const { elementAsString } = useLanguage();
  return <div data-testid='subject'>{elementAsString(getParsedLanguageFromText(input))}</div>;
};

const TestSimple = ({ input }: { input: string }) => {
  const { langAsString } = useLanguage();
  return (
    <>
      <div data-testid='as-string'>{langAsString(input)}</div>
      <div data-testid='as-element'>
        <Lang id={input} />
      </div>
    </>
  );
};

const TestComplexAsString = () => {
  const { elementAsString, langAsString } = useLanguage();

  const params = [
    '<strong>hello world</strong>',
    <span key={0}>
      <Lang
        id='input_components.character_limit_sr_label'
        params={[
          <div key={0}>
            {'et hundre og '}
            <br />
            <Lang id='helptext.button_title' />
          </div>,
        ]}
      />
    </span>,
  ];

  const langId = 'input_components.remaining_characters';

  return (
    <>
      <div data-testid='subject1'>
        <Lang
          id={langId}
          params={params}
        />
      </div>
      <div data-testid='subject2'>
        {elementAsString(
          <Lang
            id={langId}
            params={params}
          />,
        )}
      </div>
      <div data-testid='subject3'>{langAsString(langId, params)}</div>
    </>
  );
};

describe('useLanguage', () => {
  it('elementAsString() can get the inner child of an element as a string', async () => {
    const { rerender } = await renderWithMinimalProviders({
      renderer: () => <TestElementAsString input='<h1>This is my message</h1>' />,
    });

    expect(screen.getByTestId('subject').innerHTML).toEqual('This is my message');

    rerender(<TestElementAsString input='<span>This is my message</span>' />);
    expect(screen.getByTestId('subject').innerHTML).toEqual('This is my message');

    rerender(<TestElementAsString input='<div><span>This is my message</span></div>' />);
    expect(screen.getByTestId('subject').innerHTML).toEqual('This is my message');

    rerender(
      <TestElementAsString input='<div><span>This is my message 1</span><span>This is my message 2</span></div>' />,
    );
    expect(screen.getByTestId('subject').innerHTML).toEqual('This is my message 1This is my message 2');

    rerender(<TestElementAsString input='<div><span>This is my message<br/> with newline</span></div>' />);
    expect(screen.getByTestId('subject').innerHTML).toEqual('This is my message with newline');

    rerender(
      <TestElementAsString input='<div><span>This is my message with <a href=https://www.vg.no/>link</a></span></div>' />,
    );
    expect(screen.getByTestId('subject').innerHTML).toEqual('This is my message with link');
  });

  it('elementAsString() should handle Lang components in params', async () => {
    await renderWithMinimalProviders({
      renderer: () => <TestComplexAsString />,
    });

    const expected = 'Du har hello world av Tekstfeltet kan inneholde maks et hundre og Hjelp tegn tegn igjen';

    expect(screen.getByTestId('subject1')).toHaveTextContent(expected);
    expect(screen.getByTestId('subject2')).toHaveTextContent(expected);
    expect(screen.getByTestId('subject3')).toHaveTextContent(expected);

    expect(screen.getByTestId('subject1').innerHTML).not.toEqual(expected);
    expect(screen.getByTestId('subject2').innerHTML).toEqual(expected);
    expect(screen.getByTestId('subject3').innerHTML).toEqual(expected);
  });

  it('langAsString() should properly convert HTML and markdown to strings', async () => {
    const { rerender } = await renderWithoutInstanceAndLayout({
      renderer: () => <TestSimple input='<h1>This is my message</h1>' />,
      queries: {
        fetchTextResources: async () => ({
          language: 'nb',
          resources: [
            { id: 'simpleHtml', value: '<h1>This is my message</h1>' },
            { id: 'simpleMarkdown', value: '# This is my message' },
            { id: 'complexHtml', value: '<div><span>This is my message<br/> with newline</span></div>' },
            {
              id: 'complexMarkdown',
              value: '## This is my message\n\n- With bullet\n- And another bullet',
            },
          ],
        }),
      },
    });

    expect(screen.getByTestId('as-string').innerHTML).toEqual('This is my message');
    expect(screen.getByTestId('as-element')).toHaveTextContent('This is my message');
    expect(screen.getByTestId('as-element').innerHTML).toEqual(
      '<h1 class="fds-heading-heading fds-heading-large">This is my message</h1>',
    );

    rerender(<TestSimple input='simpleHtml' />);
    expect(screen.getByTestId('as-string').innerHTML).toEqual('This is my message');
    expect(screen.getByTestId('as-element')).toHaveTextContent('This is my message');
    expect(screen.getByTestId('as-element').innerHTML).toEqual(
      '<h1 class="fds-heading-heading fds-heading-large">This is my message</h1>',
    );

    rerender(<TestSimple input='simpleMarkdown' />);
    expect(screen.getByTestId('as-string').innerHTML).toEqual('This is my message');
    expect(screen.getByTestId('as-element')).toHaveTextContent('This is my message');
    expect(screen.getByTestId('as-element').innerHTML).toEqual(
      '<h1 class="fds-heading-heading fds-heading-large">This is my message</h1>',
    );
  });
});
