import type { ISandboxProperties, SupportedSandboxProperties } from 'src/layout/IFrame/types';

const defaultSandboxPropeties = ['allow-same-origin'];

const sandboxPropertyMap: { [K in SupportedSandboxProperties]: string } = {
  allowPopups: 'allow-popups',
  allowPopupsToEscapeSandbox: 'allow-popups-to-escape-sandbox',
};

export const getSandboxProperties = (sandbox: ISandboxProperties | undefined): string => {
  if (!sandbox) {
    return defaultSandboxPropeties.join(' ');
  }

  return defaultSandboxPropeties
    .concat(
      Object.entries(sandbox)
        .filter(([, value]) => value)
        .map(([key]) => sandboxPropertyMap[key]),
    )
    .join(' ');
};
