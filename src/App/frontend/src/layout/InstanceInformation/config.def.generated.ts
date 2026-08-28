import type { ComponentBase } from '@app/layout-contract/generated/common.generated';

import { PresentationComponent } from 'src/layout/LayoutComponent';
import type { ExprResolver } from 'src/layout/LayoutComponent';

export abstract class InstanceInformationDef extends PresentationComponent<'InstanceInformation'> {
  protected readonly type = 'InstanceInformation';

  // Do not override this one, set functionality.customExpressions to true instead
  evalDefaultExpressions(props: ExprResolver<'InstanceInformation'>) {
    return {
      ...(props.item as Omit<typeof props.item, keyof ComponentBase | 'hidden'>),
      ...props.evalBase(),
      ...props.evalTrb(),
    };
  }

  // Do not override this one, set functionality.customExpressions to true instead
  evalExpressions(props: ExprResolver<'InstanceInformation'>) {
    return this.evalDefaultExpressions(props);
  }
}

// Source hash: 979cb05e03fe13b9f1f98f59660d529d67028b15137ebe2fb9c68892d2608abd
