import React from 'react';
import type { JSX, PropsWithChildren } from 'react';

import { Heading } from '@digdir/designsystemet-react';
import {
  CheckmarkCircleIcon,
  ExclamationmarkTriangleIcon,
  InformationSquareIcon,
  XMarkOctagonIcon,
} from '@navikt/aksel-icons';
import cn from 'classnames';

import { ConditionalWrapper } from 'src/app-components/ConditionalWrapper/ConditionalWrapper';
import { FullWidthWrapper } from 'src/app-components/FullWidthWrapper/FullWidthWrapper';
import { PANEL_VARIANT } from 'src/app-components/Panel/constants';
import classes from 'src/app-components/Panel/Panel.module.css';
import { useIsMobile } from 'src/hooks/useDeviceWidths';

export type PanelVariant = (typeof PANEL_VARIANT)[keyof typeof PANEL_VARIANT];

export type PanelProps = PropsWithChildren<{
  variant: PanelVariant;
  showIcon?: boolean;
  forceMobileLayout?: boolean;
  title?: JSX.Element;
  style?: React.CSSProperties;
  className?: string;
  fullWidth?: boolean;
  isOnBottom?: boolean;
  isOnTop?: boolean;
}>;

type PanelIconProps = {
  isMobileLayout: boolean;
  variant: PanelVariant;
};

function PanelIcon({ isMobileLayout, variant }: PanelIconProps) {
  const fontSize = isMobileLayout ? '2rem' : '3rem';

  switch (variant) {
    case PANEL_VARIANT.Info:
      return (
        <InformationSquareIcon
          title='info'
          fontSize={fontSize}
        />
      );
    case PANEL_VARIANT.Warning:
      return (
        <ExclamationmarkTriangleIcon
          title='warning'
          fontSize={fontSize}
        />
      );
    case PANEL_VARIANT.Error:
      return (
        <XMarkOctagonIcon
          title='error'
          fontSize={fontSize}
        />
      );
    case PANEL_VARIANT.Success:
      return (
        <CheckmarkCircleIcon
          title='success'
          fontSize={fontSize}
        />
      );
  }
}

export const Panel: React.FC<PanelProps> = ({
  variant,
  showIcon = false,
  forceMobileLayout = false,
  fullWidth = true,
  isOnBottom,
  isOnTop,
  title,
  style,
  className,
  children,
}) => {
  const isMobile = useIsMobile();
  const isMobileLayout = forceMobileLayout || isMobile;

  return (
    <ConditionalWrapper
      condition={fullWidth}
      wrapper={(child) => (
        <FullWidthWrapper
          isOnBottom={isOnBottom}
          isOnTop={isOnTop}
        >
          {child}
        </FullWidthWrapper>
      )}
    >
      <div
        className={cn(
          classes.panel,
          {
            [classes.panelMobileLayout]: isMobileLayout,
          },
          className,
        )}
        style={style}
      >
        <div className={cn(classes.panelContentWrapper, classes[`panelContentWrapper_${variant}`])}>
          {showIcon && (
            <div className={cn(classes.panelIconWrapper, classes[`panelIconWrapper_${variant}`])}>
              <PanelIcon
                isMobileLayout={isMobileLayout}
                variant={variant}
              />
            </div>
          )}
          <div className={classes.panelContent}>
            {title && (
              <Heading
                level={2}
                data-size={isMobileLayout ? 'xs' : 'sm'}
                className={classes.panelHeader}
              >
                {title}
              </Heading>
            )}
            <div>{children}</div>
          </div>
        </div>
      </div>
    </ConditionalWrapper>
  );
};
