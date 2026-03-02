import React from 'react';

import { marked } from 'marked';

import { Panel as AppPanel } from 'src/app-components/Panel/Panel';
import type { PanelVariant } from 'src/app-components/Panel/Panel';
import { useTextResource } from 'nextsrc/libs/form-client/react/hooks';
import { asTranslationKey } from 'nextsrc/libs/form-engine/AppComponentsBridge';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';
import type { CompPanelExternal } from 'src/layout/Panel/config.generated';

export const Panel = ({ component }: ComponentProps) => {
  const props = component as CompPanelExternal;
  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const bodyKey = typeof props.textResourceBindings?.body === 'string' ? props.textResourceBindings.body : undefined;
  const title = useTextResource(titleKey);
  const body = useTextResource(bodyKey);

  const variant: PanelVariant = (props.variant as PanelVariant) || 'info';
  const showIcon = props.showIcon ?? false;

  const bodyHtml = body ? marked(body, { async: false }) : '';

  return (
    <AppPanel
      variant={variant}
      showIcon={showIcon}
      title={title ? asTranslationKey(titleKey) : undefined}
    >
      {body && <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />}
    </AppPanel>
  );
};
