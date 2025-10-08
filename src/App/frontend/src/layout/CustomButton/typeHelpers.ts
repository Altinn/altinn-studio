import type * as CBTypes from 'src/layout/CustomButton/config.generated';

/**
 * A map containing all defined frontend actions from config and
 * their handler type signature (with metadata parameters). Can
 * be used to make sure that all functions have been defined.
 */
export type ClientActionHandlers = {
  [Action in CBTypes.ClientAction as Action['id']]: Action extends { metadata: infer Metadata }
    ? (params: Metadata) => Promise<void>
    : () => Promise<void>;
};

/**
 * A map containing all defined frontend actions from config.
 * Is used to type guard actions on the client such that each
 * function receives correct parameters with type safety.
 */
type ActionMap = {
  [Action in CBTypes.ClientAction as Action['id']]: Action;
};

type ActionType<T extends keyof ActionMap> = T extends keyof ActionMap ? ActionMap[T] : never;

/**
 * A function to create a type guard for a specific action.
 * isSpecificClientAction('navigateToPage', action) will
 * cast the action to NavigateToPageAction.
 */
export const isSpecificClientAction = <ActionId extends keyof ActionMap>(
  type: ActionId,
  action: CBTypes.CustomAction,
): action is ActionType<ActionId> => action.id === type;
