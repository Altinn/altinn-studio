import React from 'react';

import { Panel } from 'src/features/form/components/Panel';
import type { IComponentProps } from 'src/components';
import type { ILayoutCompPanel } from 'src/features/form/layout';

type IPanelProps = IComponentProps & Omit<ILayoutCompPanel, 'type'>;

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
