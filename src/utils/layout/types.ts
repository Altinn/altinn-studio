import type { CompDef } from 'src/layout';
import type { CompIntermediate, CompInternal, CompTypes, TypeFromNode } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { LayoutPage } from 'src/utils/layout/LayoutPage';
import type { HiddenState } from 'src/utils/layout/NodesContext';

/**
 * A row (from the data model) in a repeating group, or other components using such a structure (object[]).
 * The `uuid` is a unique identifier for the row, and `index` is the index of the row in the array. The uuid is either
 * added by us or the backend, and is used to keep track of the row when it's moved around in the array, so that
 * our JsonPatch generation can be as efficient as possible and always target a change in the correct row.
 */
export interface BaseRow {
  uuid: string;
  index: number;
}

export interface StateFactoryProps<Type extends CompTypes> {
  item: CompIntermediate<Type>;
  parent: LayoutNode | LayoutPage;
  row?: BaseRow;
}

export interface GeneratorErrors {
  // The key is the error message (making sure we don't have duplicates)
  [key: string]: true;
}

export interface BaseNodeData<T extends CompTypes> {
  type: 'node';
  layout: CompIntermediate<T>;
  item: CompInternal<T> | undefined;
  hidden: HiddenState | undefined;
  row: BaseRow | undefined;
  errors: GeneratorErrors | undefined;
}

export type NodeData<Type extends CompTypes = CompTypes> = ReturnType<CompDef<Type>['stateFactory']>;

export type NodeDataFromNode<N extends LayoutNode | undefined> = NodeData<TypeFromNode<Exclude<N, undefined>>>;
export type NodeItemFromNode<N extends LayoutNode | undefined> = CompInternal<TypeFromNode<Exclude<N, undefined>>>;
