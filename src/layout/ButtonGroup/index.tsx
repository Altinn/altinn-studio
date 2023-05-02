import React from 'react';

import type { PropsFromGenericComponent } from '..';

import { ButtonGroupComponent } from 'src/layout/ButtonGroup/ButtonGroupComponent';
import { ButtonGroupHierarchyGenerator } from 'src/layout/ButtonGroup/hierarchy';
import { ContainerComponent } from 'src/layout/LayoutComponent';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';
import type { ComponentHierarchyGenerator, HierarchyGenerator } from 'src/utils/layout/HierarchyGenerator';

export class ButtonGroup extends ContainerComponent<'ButtonGroup'> {
  render(props: PropsFromGenericComponent<'ButtonGroup'>): JSX.Element | null {
    return <ButtonGroupComponent {...props} />;
  }

  hierarchyGenerator(generator: HierarchyGenerator): ComponentHierarchyGenerator<'ButtonGroup'> {
    return new ButtonGroupHierarchyGenerator(generator);
  }

  useDisplayData(_node: LayoutNodeFromType<'ButtonGroup'>): string {
    return '';
  }

  renderSummary(): JSX.Element | null {
    return null;
  }

  canRenderInTable(): boolean {
    return false;
  }
}
