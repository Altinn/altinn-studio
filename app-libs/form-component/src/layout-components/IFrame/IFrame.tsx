import type { BaseSyntheticEvent } from 'react';

import { Panel } from '@app/form-component/app-components/Panel';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { ComponentStructure } from '@app/form-component/layout-components/common/ComponentStructure';
import type { IGridStyling } from '@app/form-component/app-components/Flex';

import { getSandboxProperties, type SandboxProperties } from './getSandboxProperties';

export interface IFrameProps {
  /** The indexed component ID; drives the form-content wrapper. */
  componentId: string;
  /**
   * Text resource key whose (non-processed) value is the HTML rendered inside the iframe via
   * `srcdoc`. Can be an HTML string, a text-resource key, or an expression result.
   */
  title?: string;
  /** Sandbox options controlling what the embedded content is allowed to do. */
  sandbox?: SandboxProperties;
  /** Grid sizing for the inner content. */
  innerGrid?: IGridStyling;
}

// Resize the iframe to fit the content loaded inside it.
const adjustIFrameSize = (event: BaseSyntheticEvent): void => {
  event.target.style.height = `${event.target.contentWindow.document.documentElement.scrollHeight}px`;
};

export function IFrame({ componentId, title, sandbox, innerGrid }: IFrameProps) {
  const { lang, langAsNonProcessedString } = useTranslation();

  const isSrcDocUnsupported = !('srcdoc' in document.createElement('iframe'));
  if (isSrcDocUnsupported) {
    return (
      <Panel
        variant='error'
        showIcon={true}
        title={lang('iframe_component.unsupported_browser_title')}
      >
        <p>{lang('iframe_component.unsupported_browser')}</p>
      </Panel>
    );
  }

  const htmlString = langAsNonProcessedString(title);

  return (
    <ComponentStructure componentId={componentId} innerGrid={innerGrid}>
      <iframe
        scrolling='no'
        frameBorder={0}
        width='100%'
        srcDoc={htmlString}
        // Preserves existing behaviour: the accessible title is the configured text-resource key.
        title={title}
        onLoad={adjustIFrameSize}
        sandbox={getSandboxProperties(sandbox)}
      />
    </ComponentStructure>
  );
}
