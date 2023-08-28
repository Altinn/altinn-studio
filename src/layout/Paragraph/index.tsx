import React from 'react';

import { ParagraphDef } from 'src/layout/Paragraph/config.def.generated';
import { ParagraphComponent } from 'src/layout/Paragraph/ParagraphComponent';
import type { PropsFromGenericComponent } from 'src/layout';

export class Paragraph extends ParagraphDef {
  render(props: PropsFromGenericComponent<'Paragraph'>): JSX.Element | null {
    return <ParagraphComponent {...props} />;
  }
}
