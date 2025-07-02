import React from 'react';
import type { JSX } from 'react';

import { PANEL_VARIANT } from 'src/app-components/Panel/constants';
import { Panel } from 'src/app-components/Panel/Panel';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { getSandboxProperties } from 'src/layout/IFrame/utils';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export type IFrameComponentProps = PropsFromGenericComponent<'IFrame'>;

export const IFrameComponent = ({ node }: IFrameComponentProps): JSX.Element => {
  const { langAsNonProcessedString } = useLanguage();
  const { textResourceBindings, sandbox } = useItemWhenType(node.baseId, 'IFrame');

  const sandboxProperties = getSandboxProperties(sandbox);
  const iFrameTitle = textResourceBindings?.title;
  const HTMLString = langAsNonProcessedString(iFrameTitle);

  const isSrcDocUnsupported = !('srcdoc' in document.createElement('iframe'));
  if (isSrcDocUnsupported) {
    return (
      <Panel
        variant={PANEL_VARIANT.Error}
        showIcon={true}
        title={<Lang id='iframe_component.unsupported_browser_title' />}
        fullWidth={false}
      >
        <p>
          <Lang id='iframe_component.unsupported_browser' />
        </p>
      </Panel>
    );
  }

  // Resize the iframe to fit the content thats loaded inside it
  const adjustIFrameSize = (iframe: React.BaseSyntheticEvent): void => {
    iframe.target.style.height = `${iframe.target.contentWindow.document.documentElement.scrollHeight}px`;
  };

  return (
    <ComponentStructureWrapper node={node}>
      <iframe
        scrolling='no'
        frameBorder={0}
        width='100%'
        srcDoc={HTMLString}
        title={iFrameTitle}
        onLoad={adjustIFrameSize}
        sandbox={sandboxProperties}
      />
    </ComponentStructureWrapper>
  );
};
