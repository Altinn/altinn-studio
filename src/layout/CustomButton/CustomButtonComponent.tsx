import React, { useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';

import { useMutation } from '@tanstack/react-query';

import { Button } from 'src/app-components/Button/Button';
import { useAppMutations } from 'src/core/contexts/AppQueriesProvider';
import { useResetScrollPosition } from 'src/core/ui/useResetScrollPosition';
import { FD } from 'src/features/formData/FormDataWrite';
import { useLaxProcessData } from 'src/features/instance/ProcessContext';
import { Lang } from 'src/features/language/Lang';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useIsSubformPage, useNavigationParam } from 'src/features/routing/AppRoutingContext';
import { useOnPageNavigationValidation } from 'src/features/validation/callbacks/onPageNavigationValidation';
import { useNavigatePage } from 'src/hooks/useNavigatePage';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { isSpecificClientAction } from 'src/layout/CustomButton/typeHelpers';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import { promisify } from 'src/utils/promisify';
import type { ButtonColor, ButtonVariant } from 'src/app-components/Button/Button';
import type { BackendValidationIssueGroups } from 'src/features/validation';
import type { PropsFromGenericComponent } from 'src/layout';
import type * as CBTypes from 'src/layout/CustomButton/config.generated';
import type { ClientActionHandlers } from 'src/layout/CustomButton/typeHelpers';
import type { IInstance, IUserAction } from 'src/types/shared';

type Props = PropsFromGenericComponent<'CustomButton'>;

type UpdatedDataModels = {
  [dataModelGuid: string]: object;
};

/**
 * This is the format we get from app-lib, it turns out mapping BackendValidationIssueGroups on a per-dataelement basis is unecessary,
 * and so this mapping is simply un-done after receiving it. To avoid breaking changes which would require handling multiple
 * formats in app-frontend, we decided to leave it as is for now, as it does not have any practical consequences. In a future
 * major/breaking release which would require a specific backend version, this could be changed to simply return a single BackendValidationIssueGroups object.
 */
type UpdatedValidationIssues = {
  [dataModelGuid: string]: BackendValidationIssueGroups;
};

type FormDataLockTools = ReturnType<typeof FD.useLocking>;

export type ActionResult = {
  instance: IInstance | undefined;
  updatedDataModels?: UpdatedDataModels;
  updatedValidationIssues?: UpdatedValidationIssues;
  clientActions?: CBTypes.ClientAction[];
  redirectUrl: string;
};

type UseHandleClientActions = {
  handleClientActions: (actions: CBTypes.ClientAction[]) => Promise<void>;
  handleDataModelUpdate: (lockTools: FormDataLockTools, result: ActionResult) => Promise<void>;
};

/**
 * A type guard to check if the action is an action that can be run entirely on the client
 */
const isClientAction = (action: CBTypes.CustomAction): action is CBTypes.ClientAction => action.type === 'ClientAction';
/**
 * A type guard to check if the action is an action that requires a server side call
 */
const isServerAction = (action: CBTypes.CustomAction): action is CBTypes.ServerAction => action.type === 'ServerAction';

function useHandleClientActions(): UseHandleClientActions {
  const { navigateToPage, navigateToNextPage, navigateToPreviousPage, exitSubform } = useNavigatePage();
  const mainPageKey = useNavigationParam('mainPageKey');
  const isSubformPage = useIsSubformPage();

  const frontendActions: ClientActionHandlers = useMemo(
    () => ({
      nextPage: promisify(navigateToNextPage),
      previousPage: promisify(navigateToPreviousPage),
      navigateToPage: promisify<ClientActionHandlers['navigateToPage']>(async ({ page }) => navigateToPage(page)),
      closeSubform: promisify(exitSubform),
    }),
    [exitSubform, navigateToNextPage, navigateToPage, navigateToPreviousPage],
  );

  const handleClientAction = useCallback(
    async (action: CBTypes.ClientAction) => {
      if (action.id == null) {
        window.logError('Client action is missing id. Did you provide the id of the action? Action:', action);
        return;
      }

      if (isSpecificClientAction('navigateToPage', action)) {
        return await frontendActions[action.id](action.metadata);
      }

      const subformActions = ['closeSubform'];
      if ((!isSubformPage || !mainPageKey) && subformActions.includes(action.id)) {
        throw new Error('SubformAction is only applicable for subforms');
      }

      await frontendActions[action.id]();
    },
    [frontendActions, isSubformPage, mainPageKey],
  );

  const handleClientActions: UseHandleClientActions['handleClientActions'] = useCallback(
    async (actions) => {
      for (const action of actions) {
        await handleClientAction(action);
      }
    },
    [handleClientAction],
  );

  const handleDataModelUpdate: UseHandleClientActions['handleDataModelUpdate'] = useCallback(
    async (lockTools, result) => {
      const instance = result.instance;
      const updatedDataModels = result.updatedDataModels;
      const _updatedValidationIssues = result.updatedValidationIssues;

      // Undo data element mapping from backend by combining sources into a single BackendValidationIssueGroups object
      const updatedValidationIssues = _updatedValidationIssues
        ? Object.values(_updatedValidationIssues).reduce((issueGroups, currentGroups) => {
            for (const [source, group] of Object.entries(currentGroups)) {
              if (!issueGroups[source]) {
                issueGroups[source] = [];
              }
              issueGroups[source].push(...group);
              return issueGroups;
            }
          }, {})
        : undefined;

      lockTools.unlock({
        instance,
        updatedDataModels,
        updatedValidationIssues,
      });
    },
    [],
  );

  return { handleClientActions, handleDataModelUpdate };
}

type PerformActionMutationProps = {
  action: CBTypes.CustomAction;
  buttonId: string;
};

type UsePerformActionMutation = {
  isPending: boolean;
  handleServerAction: (props: PerformActionMutationProps) => Promise<void>;
};

function useHandleServerActionMutation(lockTools: FormDataLockTools): UsePerformActionMutation {
  const { doPerformAction } = useAppMutations();
  const partyId = useNavigationParam('partyId');
  const instanceGuid = useNavigationParam('instanceGuid');
  const { handleClientActions, handleDataModelUpdate } = useHandleClientActions();
  const markNotReady = NodesInternal.useMarkNotReady();
  const selectedLanguage = useCurrentLanguage();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ action, buttonId }: PerformActionMutationProps) => {
      if (!instanceGuid || !partyId) {
        throw Error('Cannot perform action without partyId and instanceGuid');
      }
      return doPerformAction(partyId, instanceGuid, { action: action.id, buttonId }, selectedLanguage);
    },
  });

  const handleServerAction = useCallback(
    async ({ action, buttonId }: PerformActionMutationProps) => {
      await lockTools.lock();
      try {
        const result = await mutateAsync({ action, buttonId });

        // Server actions can bring back changes to the data model, which could cause the node tree to update. Marking
        // it as not ready now will prevent some re-renders with stale data while the result is handled later.
        markNotReady();

        await handleDataModelUpdate(lockTools, result);
        if (result.clientActions) {
          await handleClientActions(result.clientActions);
        }
      } catch (error) {
        lockTools.unlock();
        if (error?.response?.data?.error?.message !== undefined) {
          toast(<Lang id={error?.response?.data?.error?.message} />, { type: 'error' });
        } else {
          toast(<Lang id='custom_actions.general_error' />, { type: 'error' });
        }
      }
    },
    [handleClientActions, handleDataModelUpdate, lockTools, mutateAsync, markNotReady],
  );

  return { handleServerAction, isPending };
}

export function useActionAuthorization() {
  const currentTask = useLaxProcessData()?.currentTask;
  const userActions = currentTask?.userActions;
  const actionPermissions = currentTask?.actions;

  const isAuthorized = useCallback(
    (action: IUserAction['id']) =>
      (!!actionPermissions?.[action] || userActions?.find((a) => a.id === action)?.authorized) ?? false,
    [actionPermissions, userActions],
  );

  return { isAuthorized };
}

export const buttonStyles: { [style in CBTypes.ButtonStyle]: { color: ButtonColor; variant: ButtonVariant } } = {
  primary: { variant: 'primary', color: 'success' },
  secondary: { variant: 'secondary', color: 'first' },
};

function toShorthandSize(size?: CBTypes.ButtonSize): 'sm' | 'md' | 'lg' {
  switch (size) {
    case 'sm':
    case 'small':
      return 'sm';
    case 'md':
    case 'medium':
      return 'md';
    case 'lg':
    case 'large':
      return 'lg';
    default:
      return 'md';
  }
}

export const CustomButtonComponent = ({ node }: Props) => {
  const { textResourceBindings, actions, id, buttonColor, buttonSize, buttonStyle } = useNodeItem(node);

  const lockTools = FD.useLocking(id);
  const { isAuthorized } = useActionAuthorization();
  const { handleClientActions } = useHandleClientActions();
  const { handleServerAction, isPending } = useHandleServerActionMutation(lockTools);
  const onPageNavigationValidation = useOnPageNavigationValidation();

  const getScrollPosition = React.useCallback(
    () => document.querySelector(`[data-componentid="${id}"]`)?.getClientRects().item(0)?.y,
    [id],
  );
  const resetScrollPosition = useResetScrollPosition(getScrollPosition, '[data-testid="ErrorReport"]');

  const isPermittedToPerformActions = actions
    .filter((action) => action.type === 'ServerAction')
    .reduce((acc, action) => acc && isAuthorized(action.id), true);
  const disabled = !isPermittedToPerformActions || isPending;

  const isSubformCloseButton = actions.filter((action) => action.id === 'closeSubform').length > 0;
  let interceptedButtonStyle = buttonStyle ?? 'secondary';

  if (isSubformCloseButton && !buttonStyle) {
    interceptedButtonStyle = 'primary';
  }

  let buttonText = textResourceBindings?.title;
  if (isSubformCloseButton && !buttonText) {
    buttonText = 'general.done';
  }

  const onClick = async () => {
    if (disabled) {
      return;
    }
    for (const action of actions) {
      if (action.validation) {
        const prevScrollPosition = getScrollPosition();
        const hasErrors = await onPageNavigationValidation(node.page, action.validation);
        if (hasErrors) {
          resetScrollPosition(prevScrollPosition);
          return;
        }
      }

      if (isClientAction(action)) {
        await handleClientActions([action]);
      } else if (isServerAction(action)) {
        await handleServerAction({ action, buttonId: id });
      }
    }
  };

  const style = buttonStyles[interceptedButtonStyle];

  return (
    <ComponentStructureWrapper node={node}>
      <Button
        id={`custom-button-${id}`}
        disabled={disabled}
        onClick={onClick}
        size={toShorthandSize(buttonSize)}
        color={buttonColor ?? style.color}
        variant={style.variant}
        isLoading={isPending}
      >
        <Lang id={buttonText} />
      </Button>
    </ComponentStructureWrapper>
  );
};
