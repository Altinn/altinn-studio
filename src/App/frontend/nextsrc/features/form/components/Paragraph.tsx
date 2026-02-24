import React from 'react';

import { marked } from 'marked';
import { useTextResource } from 'nextsrc/libs/form-client/react/hooks';

import type { ComponentProps } from 'nextsrc/features/form/components/index';
import type { CompParagraphExternal } from 'src/layout/Paragraph/config.generated';

export const Paragraph = ({ component }: ComponentProps) => {
  const props = component as CompParagraphExternal;
  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const title = useTextResource(titleKey);
  const html = marked(title, { async: false });

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
};
