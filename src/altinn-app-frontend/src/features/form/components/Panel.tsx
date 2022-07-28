import React, { useContext } from 'react';

import {
  Panel as PanelDesignSystem,
  PanelVariant,
} from '@altinn/altinn-design-system';

import { FormComponentContext } from 'src/components';
import { ConditionalWrapper } from 'src/components/ConditionalWrapper';
import { FullWidthWrapper } from 'src/features/form/components/FullWidthWrapper';
import { assertUnreachable } from 'src/types';
import type { ILayoutCompPanel } from 'src/features/form/layout';

interface IGetVariantProps {
  variant: ILayoutCompPanel['variant'];
}

const defaultObj: IGetVariantProps = {
  variant: 'info',
};

export const getVariant = ({ variant }: IGetVariantProps = defaultObj) => {
  switch (variant) {
    case 'info':
      return PanelVariant.Info;
    case 'success':
      return PanelVariant.Success;
    case 'error':
      return PanelVariant.Error;
    case 'warning':
      return PanelVariant.Warning;
  }

  return assertUnreachable(variant, () => PanelVariant.Info);
};

export interface IPanelProps {
  title: React.ReactNode;
  children?: React.ReactNode;
  variant?: ILayoutCompPanel['variant'];
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
