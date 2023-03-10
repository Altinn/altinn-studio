import React from 'react';

import { Panel } from 'src/features/form/components/Panel';
import type { PropsFromGenericComponent } from 'src/layout';

type IPanelProps = PropsFromGenericComponent<'Panel'>;

export const PanelComponent = ({ getTextResource, node }: IPanelProps) => {
  const { textResourceBindings, variant, showIcon } = node.item;
  if (!textResourceBindings) {
    return null;
  }

  return (
    <Panel
      title={getTextResource(textResourceBindings.title)}
      showIcon={showIcon}
      variant={variant}
    >
      {getTextResource(textResourceBindings.body)}
    </Panel>
  );
};
