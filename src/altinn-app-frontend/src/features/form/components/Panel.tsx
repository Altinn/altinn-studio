import React, { useContext } from "react";

import {
  Panel as PanelDesignSystem,
  PanelVariant,
} from "@altinn/altinn-design-system";

import { FormComponentContext } from "src/components";
import { ConditionalWrapper } from "src/components/ConditionalWrapper";
import { FullWidthWrapper } from "src/features/form/components/FullWidthWrapper";

interface IGetVariantProps {
  variant?: string;
}

const defaultObj = {};

export const getVariant = ({ variant }: IGetVariantProps = defaultObj) => {
  switch (variant) {
    case "info":
      return PanelVariant.Info;
    case "success":
      return PanelVariant.Success;
    case "warning":
      return PanelVariant.Warning;
  }

  return PanelVariant.Info;
};

export interface IPanelProps {
  title: React.ReactNode;
  children?: React.ReactNode;
  variant?: string;
  showIcon?: boolean;
  showPointer?: boolean;
}

export const Panel = ({
  children,
  variant,
  showIcon,
  title,
  showPointer,
}: IPanelProps) => {
  const { grid, baseComponentId } = useContext(FormComponentContext);
  const shouldHaveFullWidth = !grid && !baseComponentId;

  return (
    <ConditionalWrapper
      condition={shouldHaveFullWidth}
      wrapper={(child) => <FullWidthWrapper>{child}</FullWidthWrapper>}
    >
      <PanelDesignSystem
        title={title}
        showIcon={showIcon}
        showPointer={showPointer}
        variant={getVariant({ variant })}
        forceMobileLayout={!shouldHaveFullWidth}
      >
        {children}
      </PanelDesignSystem>
    </ConditionalWrapper>
  );
};

export { PanelVariant };
