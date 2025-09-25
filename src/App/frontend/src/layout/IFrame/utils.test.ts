import { getSandboxProperties } from 'src/layout/IFrame/utils';

describe('IFrame utils', () => {
  it('should return default sandbox properties if sandbox = undefined', () => {
    const sandbox = getSandboxProperties(undefined);
    expect(sandbox).toEqual('allow-same-origin');
  });

  it('should return default sandbox properties if sandbox = {}', () => {
    const sandbox = getSandboxProperties({});
    expect(sandbox).toEqual('allow-same-origin');
  });

  it('should return default sandbox properties if sandbox = { allowPopups: false, allowPopupsToEscapeSandbox: false }', () => {
    const sandbox = getSandboxProperties({ allowPopups: false, allowPopupsToEscapeSandbox: false });
    expect(sandbox).toEqual('allow-same-origin');
  });

  it('should return correct sandbox properties if sandbox = { allowPopups: true, allowPopupsToEscapeSandbox: false }', () => {
    const sandbox = getSandboxProperties({ allowPopups: true, allowPopupsToEscapeSandbox: false });
    expect(sandbox).toEqual('allow-same-origin allow-popups');
  });

  it('should return correct sandbox properties if sandbox = { allowPopupsToEscapeSandbox: true }', () => {
    const sandbox = getSandboxProperties({ allowPopupsToEscapeSandbox: true });
    expect(sandbox).toEqual('allow-same-origin allow-popups-to-escape-sandbox');
  });

  it('should return correct sandbox properties if sandbox = { allowPopups: true, allowPopupsToEscapeSandbox: true }', () => {
    const sandbox = getSandboxProperties({ allowPopups: true, allowPopupsToEscapeSandbox: true });
    expect(sandbox).toEqual('allow-same-origin allow-popups allow-popups-to-escape-sandbox');
  });
});
