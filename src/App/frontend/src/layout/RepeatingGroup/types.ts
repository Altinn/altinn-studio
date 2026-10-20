import type { ExprResolved } from 'src/features/expressions/types';
import type { CompExternal } from 'src/layout/layout';

type Comp = CompExternal<'RepeatingGroup'>;
type RepGroupTrb = Exclude<Comp['textResourceBindings'], undefined>;
type RepGroupEdit = Exclude<Comp['edit'], undefined>;

// These types define the properties in a repeating group config that will have their expressions resolved
// per row instead of for the entire repeating group component at once.
type PerRowTrb =
  | 'saveAndNextButton'
  | 'saveButton'
  | 'editButtonClose'
  | 'editButtonOpen'
  | 'multipageNextButton'
  | 'multipageBackButton';
type PerRowEdit = 'deleteButton' | 'saveButton' | 'editButton' | 'alertOnDelete' | 'saveAndNextButton';
export type GroupExpressions = ExprResolved<{
  textResourceBindings?: Pick<RepGroupTrb, PerRowTrb>;
  edit?: Pick<RepGroupEdit, PerRowEdit>;
}>;
