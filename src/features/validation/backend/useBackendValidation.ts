import { useQuery } from '@tanstack/react-query';

import { ValidationIssueSources, ValidationMask, type ValidationState } from '..';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { useCurrentDataModelGuid } from 'src/features/datamodel/useBindingSchema';
import { FD } from 'src/features/formData/FormDataWrite';
import { useLaxInstance } from 'src/features/instance/InstanceContext';
import { getValidationIssueMessage, getValidationIssueSeverity } from 'src/features/validation/backend/backendUtils';

export function useBackendValidation() {
  const { fetchBackendValidations } = useAppQueries();
  const lastSavedFormData = FD.useLastSaved();
  const instanceId = useLaxInstance()?.instanceId;
  const currentDataElementId = useCurrentDataModelGuid();

  const { data: backendValidations, isFetching } = useQuery({
    queryKey: ['validation', instanceId, currentDataElementId, lastSavedFormData],
    queryFn: () =>
      instanceId?.length && currentDataElementId?.length
        ? fetchBackendValidations(instanceId, currentDataElementId)
        : [],
    select: (validationIssues) => {
      const state: ValidationState = {
        fields: {},
        components: {},
        task: [],
      };

      // Map validation issues to state
      for (const issue of validationIssues) {
        const { field, source: group } = issue;
        const severity = getValidationIssueSeverity(issue);
        const message = getValidationIssueMessage(issue);

        let category: number = ValidationMask.Backend;
        if (issue.source === ValidationIssueSources.Custom) {
          if (issue.showImmediately) {
            category = 0;
          } else if (issue.actLikeRequired) {
            category = ValidationMask.Required;
          } else {
            category = ValidationMask.CustomBackend;
          }
        }

        if (!field) {
          // Unmapped error
          if (!state.task.find((v) => v.message.key === message.key && v.severity === severity)) {
            state.task.push({ severity, message, category });
          }
          continue;
        }

        if (!state.fields[field]) {
          state.fields[field] = {};
        }
        if (!state.fields[field][group]) {
          state.fields[field][group] = [];
        }

        /**
         * There used to be more severities, like 'fixed', since there is a risk of old backend logic still sending fixed,
         * we will ignore it here.
         */
        if (['error', 'warning', 'info', 'success'].includes(severity)) {
          state.fields[field][group].push({ field, severity, message, group, category });
        }
      }

      return state;
    },
  });

  return { backendValidations, isFetching };
}
