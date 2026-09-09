import { getSandboxProperties } from './getSandboxProperties';

describe('getSandboxProperties', () => {
  it('returns the default sandbox properties when sandbox is undefined', () => {
    expect(getSandboxProperties(undefined)).toEqual('allow-same-origin');
  });

  it('returns the default sandbox properties when sandbox is empty', () => {
    expect(getSandboxProperties({})).toEqual('allow-same-origin');
  });

  it('returns the default sandbox properties when all options are false', () => {
    expect(getSandboxProperties({ allowPopups: false, allowPopupsToEscapeSandbox: false })).toEqual(
      'allow-same-origin',
    );
  });

  it('adds allow-popups when allowPopups is true', () => {
    expect(getSandboxProperties({ allowPopups: true, allowPopupsToEscapeSandbox: false })).toEqual(
      'allow-same-origin allow-popups',
    );
  });

  it('adds allow-popups-to-escape-sandbox when allowPopupsToEscapeSandbox is true', () => {
    expect(getSandboxProperties({ allowPopupsToEscapeSandbox: true })).toEqual(
      'allow-same-origin allow-popups-to-escape-sandbox',
    );
  });

  it('adds both tokens when both options are true', () => {
    expect(getSandboxProperties({ allowPopups: true, allowPopupsToEscapeSandbox: true })).toEqual(
      'allow-same-origin allow-popups allow-popups-to-escape-sandbox',
    );
  });
});
