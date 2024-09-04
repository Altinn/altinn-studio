import type { CompTypes } from 'src/layout/layout';
import type { AnySummaryOverrideProps } from 'src/layout/Summary2/config.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface Summary2Props<T extends CompTypes> {
  target: LayoutNode<T>;
  override: AnySummaryOverrideProps | undefined;
  isCompact: boolean | undefined;
}
