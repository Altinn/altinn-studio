import React from 'react';

import { Panel } from 'src/features/form/components/Panel';
import type { PropsFromGenericComponent } from 'src/components';

type IPanelProps = PropsFromGenericComponent<'Panel'>;

export const PanelComponent = ({
  getTextResource,
  textResourceBindings,
  variant,
  showIcon,
}: IPanelProps) => {
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
