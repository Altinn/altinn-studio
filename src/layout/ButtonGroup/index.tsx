import React from 'react';

import type { PropsFromGenericComponent } from '..';

import { ButtonGroupComponent } from 'src/layout/ButtonGroup/ButtonGroupComponent';
import { ButtonGroupHierarchyGenerator } from 'src/layout/ButtonGroup/hierarchy';
import { ContainerComponent } from 'src/layout/LayoutComponent';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';
import type { ComponentHierarchyGenerator } from 'src/utils/layout/HierarchyGenerator';

export class ButtonGroup extends ContainerComponent<'ButtonGroup'> {
  private _hierarchyGenerator = new ButtonGroupHierarchyGenerator();

  render(props: PropsFromGenericComponent<'ButtonGroup'>): JSX.Element | null {
    return <ButtonGroupComponent {...props} />;
  }

  hierarchyGenerator(): ComponentHierarchyGenerator<'ButtonGroup'> {
    return this._hierarchyGenerator;
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
