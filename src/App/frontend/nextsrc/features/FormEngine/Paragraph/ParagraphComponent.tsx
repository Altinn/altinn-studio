import React from 'react';

import { marked } from 'marked';
import { GlobalData } from 'nextsrc/core/globalData';

import type { CompParagraphExternal } from 'src/layout/Paragraph/config.generated';

export function ParagraphComponent(props: CompParagraphExternal) {
  const resolvedTitle = GlobalData.textResources?.resources.find(
    (resource) => resource.id === props.textResourceBindings?.title,
  );

  const cleanTitle = marked(resolvedTitle?.value ?? '', { async: false });

  return (
    <div>
      <pre>{JSON.stringify(props, null, 2)}</pre>
      <div dangerouslySetInnerHTML={{ __html: cleanTitle }} />
    </div>
  );
}
