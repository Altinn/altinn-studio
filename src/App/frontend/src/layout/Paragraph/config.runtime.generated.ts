import { componentConfig } from '@app/layout-contract/generated/components/Paragraph/config.generated';

import { Paragraph } from 'src/layout/Paragraph/index';

export function getConfig() {
  return {
    def: new Paragraph(),
    ...componentConfig,
  };
}

// Source hash: 66961f0327f86a27414cc8c0d37c3438fea29c5c34ed55aae07dbab2eb6dba9f
