import React from 'react';
import { useParams } from 'react-router';
import { toast } from 'react-toastify';

import { CustomButton } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import { isHttpError } from '@studio/http-client';
import type * as CBTypes from '@app/layout-contract/generated/components/CustomButton/config.generated';

import { useServerActionMutation } from 'src/core/queries/actions';
import { useIsAnyProcessing, useIsThisProcessing, useProcessingMutation } from 'src/core/queries/processing';
import { useResetScrollPosition } from 'src/core/ui/useResetScrollPosition';
import { FormStore } from 'src/features/form/FormContext';
import { useIsAuthorized } from 'src/features/instance/useProcessQuery';
import { Lang } from 'src/features/language/Lang';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useGetNavigationIsPrevented } from 'src/features/navigation/utils';
import { useOnPageNavigationValidation } from 'src/features/validation/callbacks/onPageNavigationValidation';
import { useIsSubformPage, useNavigationParam } from 'src/hooks/navigation';
import { useNavigatePage } from 'src/hooks/useNavigatePage';
import { usePageValidation } from 'src/hooks/usePageValidation';
import { isSpecificClientAction } from 'src/layout/CustomButton/typeHelpers';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalOptionalText } from 'src/utils/layout/useEvalExpression';
import type { ActionResult } from 'src/core/api-client/actions.api';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ClientActionHandlers } from 'src/layout/CustomButton/typeHelpers';

type FormDataLocking = ReturnType<typeof FormStore.data.useLocking>;
type FormDataLock = Awaited<ReturnType<FormDataLocking>>;

/** The body of a failed server action, with a text resource key for the message to show. */
type ActionErrorBody = { error?: { message?: string } } | undefined;

type UseHandleClientActions = {
  handleClientActions: (actions: CBTypes.ClientAction[]) => Promise<void>;
  handleDataModelUpdate: (currentLock: FormDataLock, result: ActionResult) => Promise<void>;
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

  const frontendActions: ClientActionHandlers = {
    nextPage: navigateToNextPage,
    previousPage: navigateToPreviousPage,
    navigateToPage: async ({ page }) => navigateToPage(page),
    closeSubform: exitSubform,
  };

  async function handleClientAction(action: CBTypes.ClientAction) {
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
  }

  async function handleClientActions(actions: CBTypes.ClientAction[]) {
    for (const action of actions) {
      await handleClientAction(action);
    }
  }

  const handleDataModelUpdate: UseHandleClientActions['handleDataModelUpdate'] = async (currentLock, result) => {
    const instance = result.instance;
    const updatedDataModels = result.updatedDataModels;
    const _updatedValidationIssues = result.updatedValidationIssues;

    // Undo data element mapping from backend by combining sources into a single BackendValidationIssueGroups object
    const updatedValidationIssues = _updatedValidationIssues
      ? Object.values(_updatedValidationIssues).reduce((issueGroups, currentGroups) => {
          for (const [validator, backendValidationIssues] of Object.entries(currentGroups)) {
            if (!issueGroups[validator]) {
              issueGroups[validator] = [];
            }
            issueGroups[validator].push(...backendValidationIssues);
          }
          return issueGroups;
        }, {})
      : undefined;

    currentLock.unlock({
      instance,
      updatedDataModels,
      updatedValidationIssues,
    });
  };

  return { handleClientActions, handleDataModelUpdate };
}

export const CustomButtonComponent = ({ baseComponentId }: PropsFromGenericComponent<'CustomButton'>) => {
  const config = useComponentConfig(baseComponentId, 'CustomButton');
  const componentId = useIndexedId(baseComponentId);
  const title = useEvalOptionalText(
    config.textResourceBindings?.title,
    Expressions.CustomButton.textResourceBindings.title,
  );

  const acquireLock = FormStore.data.useLocking(componentId);
  const isAuthorized = useIsAuthorized();
  const clientActions = useHandleClientActions();
  const { handleClientActions } = clientActions;
  const { mutateAsync: performServerAction } = useServerActionMutation();
  const { instanceOwnerPartyId, instanceGuid } = useParams();
  const language = useCurrentLanguage();

  async function handleServerAction(action: CBTypes.ServerAction) {
    if (!instanceOwnerPartyId || !instanceGuid) {
      throw new Error('Cannot perform action without partyId and instanceGuid');
    }
    const lock = await acquireLock();
    try {
      const result = await performServerAction({
        instanceOwnerPartyId,
        instanceGuid,
        language,
        action: { action: action.id, buttonId: componentId },
      });
      await clientActions.handleDataModelUpdate(lock, result);
      if (result.clientActions) {
        await handleClientActions(result.clientActions);
      }
    } catch (error) {
      if (lock.isLocked()) {
        lock.unlock();
      }
      throw error;
    }
  }
  const onPageNavigationValidation = useOnPageNavigationValidation();
  const performProcess = useProcessingMutation('custom-action');
  const isThisProcessing = useIsThisProcessing('custom-action');
  const isAnyProcessing = useIsAnyProcessing();
  const instanceLocked = FormStore.useIsInstanceLocked();
  const layoutLookups = FormStore.bootstrap.useLayoutLookups();
  const { getPageValidation } = usePageValidation(baseComponentId);
  const getNavigationIsPrevented = useGetNavigationIsPrevented();
  const getScrollPosition = React.useCallback(
    () => document.querySelector(`[data-componentid="${componentId}"]`)?.getClientRects().item(0)?.y,
    [componentId],
  );
  const resetScrollPosition = useResetScrollPosition(getScrollPosition, '[data-testid="ErrorReport"]');
  const isPermittedToPerformActions = config.actions
    .filter((action) => action.type === 'ServerAction')
    .reduce((acc, action) => acc && isAuthorized(action.id), true);
  const isPreventedByIntermediatePage = config.actions.some(
    (action) => isSpecificClientAction('navigateToPage', action) && getNavigationIsPrevented(action.metadata.page),
  );
  // Client actions only navigate, so a button without server actions keeps working while the instance is locked
  const hasServerActions = config.actions.some(isServerAction);
  const disabled =
    !isPermittedToPerformActions ||
    isAnyProcessing ||
    isPreventedByIntermediatePage ||
    (instanceLocked && hasServerActions);
  const isSubformCloseButton = config.actions.filter((action) => action.id === 'closeSubform').length > 0;
  let interceptedButtonStyle = config.buttonStyle ?? 'secondary';
  if (isSubformCloseButton && !config.buttonStyle) {
    interceptedButtonStyle = 'primary';
  }
  let buttonText = title;
  if (isSubformCloseButton && !buttonText) {
    buttonText = 'general.done';
  }
  const onClick = () =>
    performProcess(async () => {
      for (const action of config.actions) {
        const isBackwardNavigation = isClientAction(action) && action.id === 'previousPage';
        const validation = action.validation ?? (isBackwardNavigation ? undefined : getPageValidation());
        if (validation) {
          const prevScrollPosition = getScrollPosition();
          const page = layoutLookups.componentToPage[baseComponentId];
          if (!page) {
            throw new Error('Could not find page for component');
          }
          const hasErrors = await onPageNavigationValidation(page, validation);
          if (hasErrors) {
            resetScrollPosition(prevScrollPosition);
            return;
          }
        }
        if (isClientAction(action)) {
          await handleClientActions([action]);
        } else if (isServerAction(action)) {
          try {
            await handleServerAction(action);
          } catch (error) {
            if (isHttpError<ActionErrorBody>(error) && error.response?.data?.error?.message !== undefined) {
              toast(<Lang id={error.response.data.error.message} />, { type: 'error' });
            } else {
              toast(<Lang id='custom_actions.general_error' />, { type: 'error' });
            }
          }
        }
      }
    });
  return (
    <CustomButton
      componentId={componentId}
      title={buttonText}
      buttonStyle={interceptedButtonStyle}
      buttonColor={config.buttonColor}
      buttonSize={config.buttonSize}
      disabled={disabled}
      isLoading={isThisProcessing}
      onClick={onClick}
    />
  );
};
