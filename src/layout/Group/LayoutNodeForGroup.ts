import {
  groupIsNonRepeating,
  groupIsNonRepeatingPanel,
  groupIsRepeating,
  groupIsRepeatingLikert,
} from 'src/layout/Group/tools';
import { BaseLayoutNode } from 'src/utils/layout/LayoutNode';
import type {
  CompGroupInternal,
  CompGroupNonRepeatingInternal,
  CompGroupNonRepeatingPanelInternal,
  CompGroupRepeatingInternal,
  CompGroupRepeatingLikertInternal,
} from 'src/layout/Group/config.generated';

export class LayoutNodeForGroup<T extends CompGroupInternal = CompGroupInternal> extends BaseLayoutNode<T, 'Group'> {
  public isRepGroup(): this is LayoutNodeForGroup<CompGroupRepeatingInternal> {
    return groupIsRepeating(this.item);
  }

  public isNonRepGroup(): this is LayoutNodeForGroup<CompGroupNonRepeatingInternal> {
    return groupIsNonRepeating(this.item);
  }

  public isNonRepPanelGroup(): this is LayoutNodeForGroup<CompGroupNonRepeatingPanelInternal> {
    return groupIsNonRepeatingPanel(this.item);
  }

  public isRepGroupLikert(): this is LayoutNodeForGroup<CompGroupRepeatingLikertInternal> {
    return groupIsRepeatingLikert(this.item);
  }
}
