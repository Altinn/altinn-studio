import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { GenericComponent } from 'src/layout/GenericComponent';
import { GroupDef } from 'src/layout/Group/config.def.generated';
import { GroupComponent } from 'src/layout/Group/GroupComponent';
import { GroupSummary } from 'src/layout/Group/GroupSummary';
import { SummaryGroupComponent } from 'src/layout/Group/SummaryGroupComponent';
import { EmptyChildrenBoundary } from 'src/layout/Summary2/isEmpty/EmptyChildrenContext';
import { claimNonRepeatingChildren } from 'src/utils/layout/plugins/claimNonRepeatingChildren';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ChildClaimerProps, SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export class Group extends GroupDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Group'>>(
    function LayoutComponentGroupRender(props, _): JSX.Element | null {
      return (
        <GroupComponent
          baseComponentId={props.baseComponentId}
          renderLayoutComponent={(id) => (
            <GenericComponent
              key={id}
              baseComponentId={id}
            />
          )}
        />
      );
    },
  );

  renderSummary(props: SummaryRendererProps): JSX.Element | null {
    return <SummaryGroupComponent {...props} />;
  }

  renderSummary2(props: Summary2Props): JSX.Element | null {
    return (
      <EmptyChildrenBoundary>
        <GroupSummary {...props} />
      </EmptyChildrenBoundary>
    );
  }

  renderSummaryBoilerplate(): boolean {
    return false;
  }

  claimChildren(props: ChildClaimerProps<'Group'>): void {
    claimNonRepeatingChildren(props, props.item.children, { componentType: 'Group' });
  }
}
