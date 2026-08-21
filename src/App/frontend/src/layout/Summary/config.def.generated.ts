import type { ComponentBase } from '@app/layout-contract/generated/common.generated';

import { PresentationComponent } from 'src/layout/LayoutComponent';
import type { ExprResolver } from 'src/layout/LayoutComponent';

export abstract class SummaryDef extends PresentationComponent<'Summary'> {
  protected readonly type = 'Summary';

  directRender(): boolean {
    return true;
  }

  // Do not override this one, set functionality.customExpressions to true instead
  evalDefaultExpressions(props: ExprResolver<'Summary'>) {
    return {
      ...(props.item as Omit<typeof props.item, keyof ComponentBase | 'hidden'>),
      ...props.evalBase(),
      ...props.evalTrb(),
    };
  }

  // Do not override this one, set functionality.customExpressions to true instead
  evalExpressions(props: ExprResolver<'Summary'>) {
    return this.evalDefaultExpressions(props);
  }
}

// Source hash: 15bbed937cebdf18186c157a513e8782d51087cd7061f34c355227b01483c61a
