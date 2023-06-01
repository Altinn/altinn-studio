import React from 'react';

import { Panel, PanelVariant } from '@altinn/altinn-design-system';

import { useLanguage } from 'src/hooks/useLanguage';
import { getSandboxProperties } from 'src/layout/IFrame/utils';
import type { PropsFromGenericComponent } from 'src/layout';

export type IFrameComponentProps = PropsFromGenericComponent<'IFrame'>;

export const IFrameComponent = ({ node, getTextResourceAsString }: IFrameComponentProps): JSX.Element => {
  const { lang } = useLanguage();
  const { textResourceBindings, sandbox } = node.item;

  const sandboxProperties = getSandboxProperties(sandbox);
  const iFrameTitle = textResourceBindings?.title;
  const HTMLString = iFrameTitle ? getTextResourceAsString(iFrameTitle) : '';

  const isSrcDocUnsupported = !('srcdoc' in document.createElement('iframe'));
  if (isSrcDocUnsupported) {
    return (
      <Panel
        variant={PanelVariant.Error}
        title={lang('iframe_component.unsupported_browser_title')}
      >
        <p>{lang('iframe_component.unsupported_browser')}</p>
      </Panel>
    );
  }

  // Resize the iframe to fit the content thats loaded inside it
  const adjustIFrameSize = (iframe: React.BaseSyntheticEvent): void => {
    iframe.target.style.height = `${iframe.target.contentWindow.document.documentElement.scrollHeight}px`;
  };

  return (
    <iframe
      scrolling='no'
      frameBorder={0}
      width='100%'
      srcDoc={HTMLString}
      title={iFrameTitle}
      onLoad={adjustIFrameSize}
      sandbox={sandboxProperties}
    />
  );
};
