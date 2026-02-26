import React, { useCallback, useRef } from 'react';

import { useLanguage } from 'nextsrc/libs/form-client/react/useLanguage';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';

import type { CompIFrameExternal, ISandboxProperties } from 'src/layout/IFrame/config.generated';

const defaultSandboxProperties = ['allow-same-origin'];

const sandboxPropertyMap: Record<string, string> = {
  allowPopups: 'allow-popups',
  allowPopupsToEscapeSandbox: 'allow-popups-to-escape-sandbox',
};

function getSandboxProperties(sandbox: ISandboxProperties | undefined): string {
  if (!sandbox) {
    return defaultSandboxProperties.join(' ');
  }
  return defaultSandboxProperties
    .concat(
      Object.entries(sandbox)
        .filter(([, value]) => value)
        .map(([key]) => sandboxPropertyMap[key]),
    )
    .join(' ');
}

export const IFrame = ({ component }: ComponentProps) => {
  const props = component as CompIFrameExternal;
  const { langAsString } = useLanguage();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const srcDoc = langAsString(titleKey);

  const handleLoad = useCallback(() => {
    const iframe = iframeRef.current;
    if (iframe?.contentDocument?.body) {
      iframe.style.height = `${iframe.contentDocument.body.scrollHeight}px`;
    }
  }, []);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcDoc || undefined}
      sandbox={getSandboxProperties(props.sandbox)}
      onLoad={handleLoad}
      style={{ width: '100%', border: 'none' }}
      title={props.id}
    />
  );
};
