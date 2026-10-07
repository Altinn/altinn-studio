import { componentConfig } from '@app/layout-contract/generated/components/IFrame/config.generated';

import { IFrame } from 'src/layout/IFrame/index';

export function getConfig() {
  return {
    def: new IFrame(),
    ...componentConfig,
  };
}

// Source hash: 5002fc3c39da6511b9253983086cfaba1beb0a320d3af4cb13053d58446daae9
