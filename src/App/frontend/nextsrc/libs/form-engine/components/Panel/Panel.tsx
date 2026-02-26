import React from 'react';

import { Heading } from '@digdir/designsystemet-react';
import {
  CheckmarkCircleIcon,
  ExclamationmarkTriangleIcon,
  InformationSquareIcon,
  XMarkOctagonIcon,
} from '@navikt/aksel-icons';
import { marked } from 'marked';
import { useTextResource } from 'nextsrc/libs/form-client/react/hooks';

import classes from 'nextsrc/libs/form-engine/components/Panel/Panel.module.css';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';
import type { CompPanelExternal } from 'src/layout/Panel/config.generated';

type PanelVariant = 'info' | 'warning' | 'error' | 'success';

const iconMap: Record<PanelVariant, React.ComponentType<{ fontSize: string }>> = {
  info: InformationSquareIcon,
  warning: ExclamationmarkTriangleIcon,
  error: XMarkOctagonIcon,
  success: CheckmarkCircleIcon,
};

export const Panel = ({ component }: ComponentProps) => {
  const props = component as CompPanelExternal;
  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const bodyKey = typeof props.textResourceBindings?.body === 'string' ? props.textResourceBindings.body : undefined;
  const title = useTextResource(titleKey);
  const body = useTextResource(bodyKey);

  const variant: PanelVariant = (props.variant as PanelVariant) || 'info';
  const showIcon = props.showIcon ?? false;

  const bodyHtml = body ? marked(body, { async: false }) : '';

  const Icon = iconMap[variant];

  return (
    <div className={classes.panel}>
      <div className={`${classes.panelContentWrapper} ${classes[`panelContentWrapper_${variant}`]}`}>
        {showIcon && (
          <div className={`${classes.panelIconWrapper} ${classes[`panelIconWrapper_${variant}`]}`}>
            <Icon fontSize='2rem' />
          </div>
        )}
        <div className={classes.panelContent}>
          {title && (
            <Heading
              level={2}
              data-size='sm'
            >
              {title}
            </Heading>
          )}
          {body && <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />}
        </div>
      </div>
    </div>
  );
};
