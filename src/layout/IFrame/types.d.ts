import type { ILayoutCompBase } from 'src/layout/layout';

export type ILayoutCompIFrame = ILayoutCompBase<'IFrame'> & {
  sandbox?: ISandboxProperties;
};

export type SupportedSandboxProperties = 'allowPopups' | 'allowPopupsToEscapeSandbox';

export type ISandboxProperties = {
  [K in SupportedSandboxProperties]?: boolean;
};
