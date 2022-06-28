import React from "react";

import { Panel } from "src/features/form/components/Panel";

import type { IComponentProps } from "src/components";

interface IPanelProps extends IComponentProps {
  variant?: string;
  showIcon?: boolean;
}

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
