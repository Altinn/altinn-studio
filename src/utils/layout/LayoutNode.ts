import { getComponentDef } from 'src/layout';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import type { CompClassMap } from 'src/layout';
import type { CompCategory } from 'src/layout/common';
import type { CompTypes, LayoutNodeFromCategory, ParentNode } from 'src/layout/layout';

export interface LayoutNodeProps<Type extends CompTypes> {
  id: string;
  baseId: string;
  type: Type;
  parent: ParentNode;
  rowIndex: number | undefined;
  multiPageIndex: number | undefined;
}

/**
 * A LayoutNode is a pointer to an instance of a component in the layout. Some components will appear only once, but
 * others (like those inside repeating groups) will appear multiple times.
 */
export class LayoutNode<Type extends CompTypes = CompTypes> {
  public readonly parent: ParentNode;
  public readonly rowIndex?: number;
  public readonly page: LayoutPage;
  public readonly def: CompClassMap[Type];
  public readonly id: string;
  public readonly baseId: string;
  public readonly multiPageIndex: number | undefined;
  public readonly pageKey: string;
  public readonly type: Type;

  public constructor({ id, type, baseId, parent, rowIndex, multiPageIndex }: LayoutNodeProps<Type>) {
    this.id = id;
    this.baseId = baseId;
    this.type = type;
    this.multiPageIndex = multiPageIndex;
    this.page = parent instanceof LayoutPage ? parent : parent.page;
    this.pageKey = this.page.pageKey;
    this.def = getComponentDef(this.type);
    this.parent = parent;
    this.rowIndex = rowIndex;
  }

  public isType<T extends CompTypes>(type: T): this is LayoutNode<T> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.type as any) === type;
  }

  public isCategory<T extends CompCategory>(category: T): this is LayoutNodeFromCategory<T> {
    return this.def.category === category;
  }
}
