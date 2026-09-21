import type { ComponentBase } from '@app/layout-contract/generated/common.generated';

import { PresentationComponent } from 'src/layout/LayoutComponent';
import type { ExprResolver } from 'src/layout/LayoutComponent';

export abstract class AudioDef extends PresentationComponent<'Audio'> {
  protected readonly type = 'Audio';

  // Do not override this one, set functionality.customExpressions to true instead
  evalDefaultExpressions(props: ExprResolver<'Audio'>) {
    return {
      ...(props.item as Omit<typeof props.item, keyof ComponentBase | 'hidden'>),
      ...props.evalBase(),
      ...props.evalTrb(),
    };
  }

  // Do not override this one, set functionality.customExpressions to true instead
  evalExpressions(props: ExprResolver<'Audio'>) {
    return this.evalDefaultExpressions(props);
  }
}

// Source hash: 770c22385ade7363db31ba988b22b8af611fa4a4db442fe99f0a37b72c93260e
