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
import { Field, Paragraph, ValidationMessage } from '@digdir/designsystemet-react';
import { queryOptions, useQuery } from '@tanstack/react-query';

import type { PropsFromGenericComponent } from '..';

import { FormStore } from 'src/features/form/FormContext';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { Lang } from 'src/features/language/Lang';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import classes from 'src/layout/OrganisationLookup/OrganisationLookupComponent.module.css';
import { validateOrganisationLookupResponse, validateOrgnr } from 'src/layout/OrganisationLookup/validation';
import utilClasses from 'src/styles/utils.module.css';
import { useLabel } from 'src/utils/layout/useLabel';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import { httpGet } from 'src/utils/network/networking';
import { appPath } from 'src/utils/urls/appUrlHelper';

const orgLookupQueries = {
  lookup: (orgNr: string) =>
    queryOptions({
      queryKey: [{ scope: 'organisationLookup', orgNr }],
      queryFn: () => fetchOrg(orgNr),
      enabled: false,
      gcTime: 0,
    }),
};

const LIVE_REGION_RESET_DELAY_MS = 100;

export type Organisation = {
  orgNr: string;
  name: string;
};
export type OrganisationLookupResponse =
  | { success: false; organisationDetails: null }
  | { success: true; organisationDetails: Organisation };

async function fetchOrg(orgNr: string): Promise<{ org: Organisation; error: null } | { org: null; error: string }> {
  if (!orgNr) {
    throw new Error('orgNr is required');
  }
  const url = `${appPath}/api/v1/lookup/organisation/${orgNr}`;

  try {
    const response = await httpGet(url);

    if (!validateOrganisationLookupResponse(response)) {
      return { org: null, error: 'organisation_lookup.validation_invalid_response_from_server' };
    }

    if (!response.success || !response.organisationDetails) {
      return { org: null, error: 'organisation_lookup.validation_error_not_found' };
    }

    return { org: response.organisationDetails, error: null };
  } catch {
    return { org: null, error: 'organisation_lookup.unknown_error' };
  }
}

export function OrganisationLookupComponent({
  baseComponentId,
  overrideDisplay,
}: PropsFromGenericComponent<'OrganisationLookup'>) {
  const { id, dataModelBindings, required, readOnly } = useItemWhenType(baseComponentId, 'OrganisationLookup');
  const { labelText, getHelpTextComponent, getDescriptionComponent } = useLabel({
    baseComponentId,
    overrideDisplay,
  });
  const [tempOrgNr, setTempOrgNr] = useState('');
  const [orgNrErrors, setOrgNrErrors] = useState<string[]>();
  const [statusMessage, setStatusMessage] = useState('');
  const statusRef = useRef<HTMLDivElement>(null);

  const {
    formData: { organisation_lookup_orgnr, organisation_lookup_name: orgName },
    setValue,
  } = useDataModelBindings(dataModelBindings);

  const { langAsString } = useLanguage();
  const currentLanguage = useCurrentLanguage();
  const layoutLookups = FormStore.bootstrap.useLayoutLookups();
  const pickFormValue = FormStore.data.useCurrentSelector();
  const waitForSave = FormStore.data.useWaitForSave();

  const { data, refetch: performLookup, isFetching } = useQuery(orgLookupQueries.lookup(tempOrgNr));

  function announceStatusMessage(message: string) {
    setStatusMessage('');
    window.setTimeout(() => {
      setStatusMessage(message);
      statusRef.current?.focus();
    }, LIVE_REGION_RESET_DELAY_MS);
  }

  function announceOrgDetails(orgNr: string) {
    const parts = [`${langAsString('organisation_lookup.orgnr_label')} ${orgNr}`];

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

  function handleValidateOrgnr(orgNr: string): string[] | undefined {
    if (!validateOrgnr({ orgNr })) {
      const errors = validateOrgnr.errors
        ?.filter((error) => error.instancePath === '/orgNr')
        .map((error) => error.message)
        .filter((it) => it != null);
      setOrgNrErrors(errors);
      return errors;
    }
    setOrgNrErrors(undefined);
    return undefined;
  }

  async function handleSubmit() {
    const validationErrors = handleValidateOrgnr(tempOrgNr);

    if (validationErrors?.length) {
      announceStatusMessage(langAsString(validationErrors.join(' ')));
      return;
    }

    const { data } = await performLookup();
    if (data?.org) {
      setValue('organisation_lookup_orgnr', data.org.orgNr);
      dataModelBindings.organisation_lookup_name && setValue('organisation_lookup_name', data.org.name);
      await waitForSave(true);
      announceOrgDetails(data.org.orgNr);
    } else if (data?.error) {
      announceStatusMessage(langAsString(data.error));
    }
  }

  function handleClear() {
    setValue('organisation_lookup_orgnr', '');
    dataModelBindings.organisation_lookup_name && setValue('organisation_lookup_name', '');
    setTempOrgNr('');
    setOrgNrErrors(undefined);
    setStatusMessage('');
  }

  const hasSuccessfullyFetched = !!organisation_lookup_orgnr;

  const isValid = (orgNrErrors?.length && orgNrErrors?.length > 0) || data?.error;

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
              htmlFor={`${id}_orgnr`}
              label={langAsString('organisation_lookup.orgnr_label')}
              required={required}
              requiredIndicator={<RequiredIndicator required={required} />}
              description={
                hasSuccessfullyFetched ? (
                  <Description
                    description={langAsString('organisation_lookup.from_registry_description')}
                    componentId={`${id}_orgnr`}
                  />
                ) : undefined
              }
            />
          </div>
          <Field className={classes.orgnr}>
            <NumericInput
              id={`${id}_orgnr`}
              aria-describedby={hasSuccessfullyFetched ? getDescriptionId(`${id}_orgnr`) : undefined}
              aria-label={langAsString('organisation_lookup.orgnr_label')}
              value={hasSuccessfullyFetched ? organisation_lookup_orgnr : tempOrgNr}
              required={required}
              readOnly={hasSuccessfullyFetched || isFetching || readOnly}
              error={!!isValid}
              onValueChange={(e) => {
                setTempOrgNr(e.value);
                setOrgNrErrors(undefined);
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
            {orgNrErrors?.length && (
              <ValidationMessage data-size='sm'>
                <Lang id={orgNrErrors.join(' ')} />
              </ValidationMessage>
            )}
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
                  <Lang id='organisation_lookup.submit_button' />
                </Button>
              ) : (
                <Button
                  variant='secondary'
                  color='danger'
                  onClick={handleClear}
                >
                  <Lang id='organisation_lookup.clear_button' />
                </Button>
              )}
            </div>
          )}
          {data?.error && (
            <ValidationMessage
              data-size='sm'
              className={classes.apiError}
            >
              <Lang id={data.error} />
            </ValidationMessage>
          )}
          {hasSuccessfullyFetched && orgName && (
            <div
              className={classes.orgname}
              role='group'
              aria-label={langAsString('organisation_lookup.org_name')}
            >
              <Paragraph data-size='sm'>{orgName}</Paragraph>
            </div>
          )}
        </div>
        <div
          ref={statusRef}
          tabIndex={-1}
          lang={currentLanguage}
          data-testid='organisation-lookup-status'
          className={utilClasses.visuallyHidden}
        >
          {statusMessage}
        </div>
      </ComponentStructureWrapper>
    </Fieldset>
  );
}
