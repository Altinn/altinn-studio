import { capitalizeName } from 'src/utils/stringHelper';

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
});
