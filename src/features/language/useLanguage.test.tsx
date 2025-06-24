import React from 'react';

import { screen } from '@testing-library/react';

import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { parseAndCleanText } from 'src/language/sharedLanguage';
import { renderWithMinimalProviders, renderWithoutInstanceAndLayout } from 'src/test/renderWithProviders';

const TestElementAsString = ({ input }: { input: string }) => {
  const { elementAsString } = useLanguage();
  return <div data-testid='subject'>{elementAsString(parseAndCleanText(input))}</div>;
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
        id='form_filler.error_required'
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

  const langId = 'general.progress';

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

    const expected = 'Side hello world av Du må fylle ut et hundre og Hjelp';

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
    expect(screen.getByTestId('as-element').innerHTML).toMatch(
      /<h1 class="[a-z0-9- ]*" data-size="[a-z]{2}">This is my message<\/h1>/,
    );

    rerender(<TestSimple input='simpleHtml' />);
    expect(screen.getByTestId('as-string').innerHTML).toEqual('This is my message');
    expect(screen.getByTestId('as-element')).toHaveTextContent('This is my message');
    expect(screen.getByTestId('as-element').innerHTML).toMatch(
      /<h1 class="[a-z0-9- ]*" data-size="[a-z]{2}">This is my message<\/h1>/,
    );

    rerender(<TestSimple input='simpleMarkdown' />);
    expect(screen.getByTestId('as-string').innerHTML).toEqual('This is my message');
    expect(screen.getByTestId('as-element')).toHaveTextContent('This is my message');
    expect(screen.getByTestId('as-element').innerHTML).toMatch(
      /<h1 class="[a-z0-9- ]*" data-size="[a-z]{2}">This is my message<\/h1>/,
    );
  });

  it('langAsString() should work with complex lookups and arrays', async () => {
    await renderWithoutInstanceAndLayout({
      renderer: () => <TestSimple input='complex' />,
      queries: {
        fetchTextResources: async () => ({
          language: 'nb',
          resources: [
            {
              id: 'complex',
              // This complex text resource becomes an array of string elements, and failed to render as string
              // previously.
              value: "Hvor mange {0} <p style='text-transform: lowercase;'>{1}<p> brukte gatekjøkkenet i {2}?",
              variables: [
                { key: 'firstValue', dataSource: 'applicationSettings' },
                { key: 'secondValue', dataSource: 'applicationSettings' },
                { key: 'thirdValue', dataSource: 'applicationSettings' },
              ],
            },
          ],
        }),
        fetchApplicationSettings: async () => ({
          firstValue: 'liter',
          secondValue: 'FRITYROLJE',
          thirdValue: '2019',
        }),
      },
    });

    // We don't exactly parse the HTML, but we do remove the tags.
    expect(screen.getByTestId('as-string').innerHTML).toEqual(
      'Hvor mange liter FRITYROLJE brukte gatekjøkkenet i 2019?',
    );
    expect(screen.getByTestId('as-element')).toHaveTextContent(
      'Hvor mange liter FRITYROLJE brukte gatekjøkkenet i 2019?',
    );
  });
});
