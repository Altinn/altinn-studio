import React from 'react';
import type { PropsWithChildren } from 'react';

import { useIsMobile } from '@app/form-component/app-components/hooks/useDeviceWidths';
import { Heading } from '@digdir/designsystemet-react';
import {
  CheckmarkCircleIcon,
  ExclamationmarkTriangleIcon,
  InformationSquareIcon,
  XMarkOctagonIcon,
} from '@navikt/aksel-icons';
import cn from 'classnames';

import classes from './Panel.module.css';

export type PanelVariant = 'info' | 'warning' | 'error' | 'success';

export type PanelProps = PropsWithChildren<{
  variant: PanelVariant;
  showIcon?: boolean;
  forceMobileLayout?: boolean;
  title?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}>;

type PanelIconProps = {
  isMobileLayout: boolean;
  variant: PanelVariant;
};

function PanelIcon({ isMobileLayout, variant }: PanelIconProps) {
  const fontSize = isMobileLayout ? '2rem' : '3rem';

  switch (variant) {
    case 'info':
      return <InformationSquareIcon title='info' fontSize={fontSize} />;
    case 'warning':
      return <ExclamationmarkTriangleIcon title='warning' fontSize={fontSize} />;
    case 'error':
      return <XMarkOctagonIcon title='error' fontSize={fontSize} />;
    case 'success':
      return <CheckmarkCircleIcon title='success' fontSize={fontSize} />;
  }
}

export const Panel: React.FC<PanelProps> = ({
  variant,
  showIcon = false,
  forceMobileLayout = false,
  title,
  style,
  className,
  children,
}) => {
  const isMobile = useIsMobile();
  const isMobileLayout = forceMobileLayout || isMobile;

  return (
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
            <PanelIcon isMobileLayout={isMobileLayout} variant={variant} />
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
  );
};
