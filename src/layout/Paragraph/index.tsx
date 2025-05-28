import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { ParagraphDef } from 'src/layout/Paragraph/config.def.generated';
import { ParagraphComponent } from 'src/layout/Paragraph/ParagraphComponent';
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import type { PropsFromGenericComponent } from 'src/layout';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class Paragraph extends ParagraphDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Paragraph'>>(
    function LayoutComponentParagraphRender(props, _): JSX.Element | null {
      return <ParagraphComponent {...props} />;
    },
  );

  renderSummary2(props: Summary2Props<'Paragraph'>): JSX.Element | null {
    return (
      <SummaryFlex
        target={props.target}
        content={SummaryContains.Presentational}
      >
        <ParagraphComponent
          node={props.target}
          containerDivRef={React.createRef()}
        />
      </SummaryFlex>
    );
  }
}
