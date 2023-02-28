import { getParsedLanguageFromText } from 'src/language/sharedLanguage';
import { capitalizeName, getPlainTextFromNode } from 'src/utils/stringHelper';

describe('stringHelper', () => {
  it('can capitalize a name', () => {
    expect(capitalizeName('åge ågesen')).toEqual('Åge Ågesen');
    expect(capitalizeName('alf Prøysen')).toEqual('Alf Prøysen');
    expect(capitalizeName('alf  Prøysen ')).toEqual('Alf Prøysen');
    expect(capitalizeName('alf    Prøysen ')).toEqual('Alf Prøysen');
    expect(capitalizeName('  alf    prøysen ')).toEqual('Alf Prøysen');
    expect(capitalizeName('conan o’brien')).toEqual('Conan O’brien');
    expect(capitalizeName('robert conner, jr.')).toEqual('Robert Conner, Jr.');
    expect(capitalizeName('léonardo di caprio')).toEqual('Léonardo Di Caprio');
    expect(capitalizeName('" \'')).toEqual('" \'');
  });

  it('can get the inner child of an element as a string', () => {
    expect(getPlainTextFromNode(getParsedLanguageFromText('<h1>This is my message</h1>'))).toEqual(
      'This is my message',
    );
    expect(getPlainTextFromNode(getParsedLanguageFromText('<span>This is my message</span>'))).toEqual(
      'This is my message',
    );
    expect(getPlainTextFromNode(getParsedLanguageFromText('<div><span>This is my message</span></div>'))).toEqual(
      'This is my message',
    );

    expect(
      getPlainTextFromNode(
        getParsedLanguageFromText('<div><span>This is my message 1</span><span>This is my message 2</span></div>'),
      ),
    ).toEqual('This is my message 1This is my message 2');

    expect(
      getPlainTextFromNode(getParsedLanguageFromText('<div><span>This is my message<br/> with newline</span></div>')),
    ).toEqual('This is my message with newline');

    expect(
      getPlainTextFromNode(
        getParsedLanguageFromText(
          '<div><span>This is my message with <a href=https://www.vg.no/>link</a></span></div>',
        ),
      ),
    ).toEqual('This is my message with link');

    const myReactNode: React.ReactNode = getParsedLanguageFromText('<div><span>This is my message</span></div>');
    expect(getPlainTextFromNode(myReactNode)).toEqual('This is my message');
  });
});
