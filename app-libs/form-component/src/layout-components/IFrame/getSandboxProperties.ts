/** The sandbox options a Studio user can toggle for an IFrame. */
export interface SandboxProperties {
  allowPopups?: boolean;
  allowPopupsToEscapeSandbox?: boolean;
}

const defaultSandboxProperties = ['allow-same-origin'];

const sandboxPropertyMap: { [K in keyof SandboxProperties]-?: string } = {
  allowPopups: 'allow-popups',
  allowPopupsToEscapeSandbox: 'allow-popups-to-escape-sandbox',
};

/**
 * Builds the value for the iframe `sandbox` attribute. `allow-same-origin` is always included; each
 * enabled option adds its corresponding token.
 */
export const getSandboxProperties = (sandbox: SandboxProperties | undefined): string => {
  if (!sandbox) {
    return defaultSandboxProperties.join(' ');
  }

  return defaultSandboxProperties
    .concat(
      Object.entries(sandbox)
        .filter(([, value]) => value)
        .map(([key]) => sandboxPropertyMap[key as keyof SandboxProperties]),
    )
    .join(' ');
};
