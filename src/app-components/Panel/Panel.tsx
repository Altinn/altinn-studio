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

import { PANEL_VARIANT } from 'src/app-components/Panel/constants';
import classes from 'src/app-components/Panel/Panel.module.css';
import { useIsMobile } from 'src/hooks/useDeviceWidths';

export type PanelVariant = (typeof PANEL_VARIANT)[keyof typeof PANEL_VARIANT];

type PanelProps = PropsWithChildren<{
  variant: PanelVariant;
  showIcon?: boolean;
  forceMobileLayout?: boolean;
  title?: JSX.Element;
  style?: React.CSSProperties;
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
  title,
  style,
  children,
}) => {
  const isMobile = useIsMobile();
  const isMobileLayout = forceMobileLayout || isMobile;

  return (
    <div
      className={cn(classes.panel, {
        [classes.panelMobileLayout]: isMobileLayout,
      })}
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
              size={isMobileLayout ? 'xs' : 'sm'}
              className={classes.panelHeader}
            >
              {title}
            </Heading>
          )}
          <div>{children}</div>
        </div>
      </div>
    </div>
  );
};
