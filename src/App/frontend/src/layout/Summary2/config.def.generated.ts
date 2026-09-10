import type { ComponentBase } from '@app/layout-contract/generated/common.generated';

import { PresentationComponent } from 'src/layout/LayoutComponent';
import type { ExprResolver } from 'src/layout/LayoutComponent';

export abstract class Summary2Def extends PresentationComponent<'Summary2'> {
  protected readonly type = 'Summary2';

  directRender(): boolean {
    return true;
  }

  // Do not override this one, set functionality.customExpressions to true instead
  evalDefaultExpressions(props: ExprResolver<'Summary2'>) {
    return {
      ...(props.item as Omit<typeof props.item, keyof ComponentBase | 'hidden'>),
      ...props.evalBase(),
      ...props.evalTrb(),
    };
  }

  // Do not override this one, set functionality.customExpressions to true instead
  evalExpressions(props: ExprResolver<'Summary2'>) {
    return this.evalDefaultExpressions(props);
  }
}

// Source hash: f6ff91429c2fb139aaef9e4b6678d3be1fc4a5387fc88c76c6dcf3cb39086aad
