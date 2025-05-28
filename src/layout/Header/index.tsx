import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { HeaderDef } from 'src/layout/Header/config.def.generated';
import { HeaderComponent } from 'src/layout/Header/HeaderComponent';
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import type { PropsFromGenericComponent } from 'src/layout';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class Header extends HeaderDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Header'>>(
    function LayoutComponentHeaderRender(props, _): JSX.Element | null {
      return <HeaderComponent {...props} />;
    },
  );

  renderSummary2(props: Summary2Props<'Header'>): JSX.Element | null {
    return (
      <SummaryFlex
        target={props.target}
        content={SummaryContains.Presentational}
      >
        <HeaderComponent
          node={props.target}
          containerDivRef={React.createRef()}
        />
      </SummaryFlex>
    );
  }
}
