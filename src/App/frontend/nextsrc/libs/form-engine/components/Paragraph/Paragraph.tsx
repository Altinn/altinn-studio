import React from 'react';

import { marked } from 'marked';
import { useTextResource } from 'nextsrc/libs/form-client/react/hooks';

import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';
import type { CompParagraphExternal } from 'src/layout/Paragraph/config.generated';

export const Paragraph = ({ component }: ComponentProps) => {
  const props = component as CompParagraphExternal;
  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const title = useTextResource(titleKey);
  const html = marked(title, { async: false });

  const helpKey = typeof props.textResourceBindings?.help === 'string' ? props.textResourceBindings.help : undefined;
  const helpText = useTextResource(helpKey);
  const helpHtml = helpText ? marked(helpText, { async: false }) : '';

  return (
    <div>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      {helpText && (
        <details>
          <summary>Hjelp</summary>
          <div dangerouslySetInnerHTML={{ __html: helpHtml }} />
        </details>
      )}
    </div>
  );
};
