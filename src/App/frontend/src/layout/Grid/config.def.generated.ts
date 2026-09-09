import type { ComponentBase, SummarizableComponentProps } from '@app/layout-contract/generated/common.generated';

import { ContainerComponent } from 'src/layout/LayoutComponent';
import type { ExprResolver } from 'src/layout/LayoutComponent';

export abstract class GridDef extends ContainerComponent<'Grid'> {
  protected readonly type = 'Grid';

  // Do not override this one, set functionality.customExpressions to true instead
  evalDefaultExpressions(props: ExprResolver<'Grid'>) {
    return {
      ...(props.item as Omit<typeof props.item, keyof ComponentBase | keyof SummarizableComponentProps | 'hidden'>),
      ...props.evalBase(),
      ...props.evalSummarizable(),
      ...props.evalTrb(),
    };
  }

  // Do not override this one, set functionality.customExpressions to true instead
  evalExpressions(props: ExprResolver<'Grid'>) {
    return this.evalDefaultExpressions(props);
  }
}

// Source hash: 960ab2aa1712ebcf730fef26ffb3acf43526fdaf3ab34365990b4459d84177f6
