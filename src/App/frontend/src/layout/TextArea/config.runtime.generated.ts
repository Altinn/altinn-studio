import { componentConfig } from '@app/layout-contract/generated/components/TextArea/config.generated';

import { TextArea } from 'src/layout/TextArea/index';

export function getConfig() {
  return {
    def: new TextArea(),
    ...componentConfig,
  };
}

// Source hash: b269c179fd9a73303e0c269e4e0f60351e698115b049a08c93cf56db93efa494
