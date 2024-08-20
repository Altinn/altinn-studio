import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { GenericComponent } from 'src/layout/GenericComponent';
import { GroupDef } from 'src/layout/Group/config.def.generated';
import { GroupComponent } from 'src/layout/Group/GroupComponent';
import { GroupSummary } from 'src/layout/Group/GroupSummary';
import { SummaryGroupComponent } from 'src/layout/Group/SummaryGroupComponent';
import type { PropsFromGenericComponent } from 'src/layout';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class Group extends GroupDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Group'>>(
    function LayoutComponentGroupRender(props, _): JSX.Element | null {
      return (
        <GroupComponent
          groupNode={props.node}
          renderLayoutNode={(node) => (
            <GenericComponent
              key={node.id}
              node={node}
            />
          )}
        />
      );
    },
  );

  renderSummary(props: SummaryRendererProps<'Group'>): JSX.Element | null {
    return <SummaryGroupComponent {...props} />;
  }

  renderSummary2(props: Summary2Props<'Group'>): JSX.Element | null {
    return (
      <GroupSummary
        componentNode={props.target}
        summaryOverrides={props.overrides}
      />
    );
  }

  renderSummaryBoilerplate(): boolean {
    return false;
  }
}
