import React, { useRef, useState } from 'react';

import {
  Button,
  Description,
  Fieldset,
  getDescriptionId,
  Label,
  NumericInput,
  RequiredIndicator,
} from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import { Field, Paragraph, ValidationMessage } from '@digdir/designsystemet-react';

import type { PropsFromGenericComponent } from '..';

import { useOrganizationLookup } from 'src/core/queries/lookup';
import { FormStore } from 'src/features/form/FormContext';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { Lang } from 'src/features/language/Lang';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { ComponentValidations } from 'src/features/validation/ComponentValidations';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { hasValidationErrors } from 'src/features/validation/utils';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import classes from 'src/layout/OrganizationLookup/OrganizationLookupComponent.module.css';
import { checkValidOrgnNr } from 'src/layout/OrganizationLookup/validation';
import utilClasses from 'src/styles/utils.module.css';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useComponentConfig, useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import { useLabel } from 'src/utils/layout/useLabel';
import type { LookupFailure } from 'src/core/queries/lookup';

const LIVE_REGION_RESET_DELAY_MS = 100;
const organizationLookupFailureMessages: Record<LookupFailure, string> = {
  notFound: 'organization_lookup.validation_error_not_found',
  invalidResponse: 'organization_lookup.validation_invalid_response_from_server',
  forbidden: 'organization_lookup.unknown_error',
  tooManyRequests: 'organization_lookup.unknown_error',
  unknown: 'organization_lookup.unknown_error',
};

export function OrganizationLookupComponent({
  baseComponentId,
  overrideDisplay,
}: PropsFromGenericComponent<'OrganizationLookup'>) {
  const config = useComponentConfig(baseComponentId, 'OrganizationLookup');
  const dataModelBindings = useDataModelBindingsFor(baseComponentId, 'OrganizationLookup');
  const componentId = useIndexedId(baseComponentId);
  const required = useEvalExpression(config.required, Expressions.OrganizationLookup.required);
  const readOnly = useEvalExpression(config.readOnly, Expressions.OrganizationLookup.readOnly);

  const { labelText, getHelpTextComponent, getDescriptionComponent } = useLabel({
    baseComponentId,
    overrideDisplay,
  });
  const [tempOrgNr, setTempOrgNr] = useState('');
  const [lookupAttempted, setLookupAttempted] = useState(false);
  const [lookupFailure, setLookupFailure] = useState<LookupFailure>();
  const invalidSearchOrgNr = lookupAttempted && !checkValidOrgnNr(tempOrgNr);
  const validations = useUnifiedValidationsForNode(baseComponentId);
  const [statusMessage, setStatusMessage] = useState('');
  const statusRef = useRef<HTMLDivElement>(null);

  const {
    formData: { orgnr, name: orgName },
    setValue,
  } = useDataModelBindings(dataModelBindings);

  const { langAsString } = useLanguage();
  const currentLanguage = useCurrentLanguage();
  const layoutLookups = FormStore.bootstrap.useLayoutLookups();
  const pickFormValue = FormStore.data.useCurrentSelector();
  const waitForSave = FormStore.data.useWaitForSave();

  const { lookup: performLookup, isFetching } = useOrganizationLookup(tempOrgNr);

  function announceStatusMessage(message: string) {
    setStatusMessage('');
    window.setTimeout(() => {
      setStatusMessage(message);
      statusRef.current?.focus();
    }, LIVE_REGION_RESET_DELAY_MS);
  }

  function announceOrgDetails(orgNr: string) {
    const parts = [`${langAsString('organization_lookup.orgnr_label')} ${orgNr}`];

    const parent = layoutLookups.componentToParent[baseComponentId];
    const childIds = parent?.type === 'node' ? layoutLookups.componentToChildren[parent.id] : undefined;
    const lookupIndex = childIds?.indexOf(baseComponentId) ?? -1;

    for (const childId of childIds?.slice(lookupIndex + 1) ?? []) {
      const component = layoutLookups.allComponents[childId];
      if (component?.type !== 'Text' || !Array.isArray(component.value) || component.value[0] !== 'dataModel') {
        continue;
      }

      const [, field, dataType] = component.value;
      if (typeof field !== 'string' || typeof dataType !== 'string') {
        continue;
      }

      const textValue = String(pickFormValue({ field, dataType }) ?? '').trim();
      if (!textValue) {
        continue;
      }

      const titleKey = component.textResourceBindings?.title;
      parts.push(typeof titleKey === 'string' ? `${langAsString(titleKey)} ${textValue}` : textValue);
    }

    announceStatusMessage(parts.join(', '));
  }

  async function handleSubmit() {
    if (readOnly || isFetching || orgnr) {
      return;
    }
    setLookupAttempted(true);
    setLookupFailure(undefined);
    if (!checkValidOrgnNr(tempOrgNr)) {
      announceStatusMessage(langAsString('organization_lookup.validation_error_orgnr'));
      return;
    }

    const { data, failure } = await performLookup();
    if (data) {
      setValue('orgnr', data.orgNr);
      dataModelBindings.name && setValue('name', data.name);
      clearSearch();
      await waitForSave(true);
      announceOrgDetails(data.orgNr);
    } else {
      setLookupFailure(failure);
      announceStatusMessage(langAsString(organizationLookupFailureMessages[failure]));
    }
  }

  function clearSearch() {
    setTempOrgNr('');
    setLookupAttempted(false);
    setLookupFailure(undefined);
  }

  function handleClear() {
    setValue('orgnr', '');
    dataModelBindings.name && setValue('name', '');
    clearSearch();
    setStatusMessage('');
  }

  const hasSuccessfullyFetched = !!orgnr;

  const invalid = invalidSearchOrgNr || !!lookupFailure || hasValidationErrors(validations);

  return (
    <Fieldset
      legend={labelText}
      legendSize='lg'
      description={getDescriptionComponent()}
      help={getHelpTextComponent()}
      size='sm'
    >
      <ComponentStructureWrapper baseComponentId={baseComponentId}>
        <div className={classes.componentWrapper}>
          <div className={classes.orgnrLabel}>
            <Label
              htmlFor={`${componentId}_orgnr`}
              label={langAsString('organization_lookup.orgnr_label')}
              required={required}
              requiredIndicator={<RequiredIndicator required={required} />}
              description={
                hasSuccessfullyFetched ? (
                  <Description
                    description={langAsString('organization_lookup.from_registry_description')}
                    componentId={`${componentId}_orgnr`}
                  />
                ) : undefined
              }
            />
          </div>
          <Field className={classes.orgnr}>
            <NumericInput
              id={`${componentId}_orgnr`}
              aria-describedby={hasSuccessfullyFetched ? getDescriptionId(`${componentId}_orgnr`) : undefined}
              aria-label={langAsString('organization_lookup.orgnr_label')}
              value={hasSuccessfullyFetched ? orgnr : tempOrgNr}
              required={required}
              readOnly={hasSuccessfullyFetched || isFetching || readOnly}
              error={invalid}
              onValueChange={(e) => {
                setTempOrgNr(e.value);
                setLookupFailure(undefined);
                setStatusMessage('');
              }}
              onKeyDown={async (ev) => {
                if (ev.key === 'Enter' && !readOnly) {
                  await handleSubmit();
                }
              }}
              allowLeadingZeros
              inputMode='numeric'
              pattern='[0-9]{9}'
            />
            {invalidSearchOrgNr && (
              <ValidationMessage data-size='sm'>
                <Lang id='organization_lookup.validation_error_orgnr' />
              </ValidationMessage>
            )}
            <ComponentValidations
              validations={validations}
              baseComponentId={baseComponentId}
            />
          </Field>
          {!readOnly && (
            <div className={classes.submit}>
              {!hasSuccessfullyFetched ? (
                <Button
                  onClick={handleSubmit}
                  variant='secondary'
                  isLoading={isFetching}
                  loadingLabel={langAsString('general.loading')}
                >
                  <Lang id='organization_lookup.submit_button' />
                </Button>
              ) : (
                <Button
                  variant='secondary'
                  color='danger'
                  onClick={handleClear}
                >
                  <Lang id='organization_lookup.clear_button' />
                </Button>
              )}
            </div>
          )}
          {lookupFailure && (
            <ValidationMessage
              data-size='sm'
              className={classes.apiError}
            >
              <Lang id={organizationLookupFailureMessages[lookupFailure]} />
            </ValidationMessage>
          )}
          {hasSuccessfullyFetched && orgName && (
            <div
              className={classes.orgname}
              role='group'
              aria-label={langAsString('organization_lookup.org_name')}
            >
              <Paragraph data-size='sm'>{orgName}</Paragraph>
            </div>
          )}
        </div>
        <div
          ref={statusRef}
          tabIndex={-1}
          lang={currentLanguage}
          data-testid='organization-lookup-status'
          className={utilClasses.visuallyHidden}
        >
          {statusMessage}
        </div>
      </ComponentStructureWrapper>
    </Fieldset>
  );
}
