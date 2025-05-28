import React, { useState } from 'react';

import { ErrorMessage, Paragraph } from '@digdir/designsystemet-react';
import { queryOptions, useQuery } from '@tanstack/react-query';

import type { PropsFromGenericComponent } from '..';

import { Button } from 'src/app-components/Button/Button';
import { NumericInput } from 'src/app-components/Input/NumericInput';
import { Fieldset } from 'src/app-components/Label/Fieldset';
import { Label } from 'src/app-components/Label/Label';
import { Description } from 'src/components/form/Description';
import { RequiredIndicator } from 'src/components/form/RequiredIndicator';
import { getDescriptionId } from 'src/components/label/Label';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import classes from 'src/layout/OrganisationLookup/OrganisationLookupComponent.module.css';
import { validateOrganisationLookupResponse, validateOrgnr } from 'src/layout/OrganisationLookup/validation';
import { useLabel } from 'src/utils/layout/useLabel';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
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
  node,
  overrideDisplay,
}: PropsFromGenericComponent<'OrganisationLookup'>) {
  const { id, dataModelBindings, required } = useNodeItem(node);
  const { labelText, getHelpTextComponent, getDescriptionComponent } = useLabel({ node, overrideDisplay });
  const [tempOrgNr, setTempOrgNr] = useState('');
  const [orgNrErrors, setOrgNrErrors] = useState<string[]>();

  const {
    formData: { organisation_lookup_orgnr, organisation_lookup_name: orgName },
    setValue,
  } = useDataModelBindings(dataModelBindings);

  const { langAsString } = useLanguage();

  const { data, refetch: performLookup, isFetching } = useQuery(orgLookupQueries.lookup(tempOrgNr));

  function handleValidateOrgnr(orgNr: string) {
    if (!validateOrgnr({ orgNr })) {
      const errors = validateOrgnr.errors
        ?.filter((error) => error.instancePath === '/orgNr')
        .map((error) => error.message)
        .filter((it) => it != null);

      setOrgNrErrors(errors);
      return false;
    }
    setOrgNrErrors(undefined);
    return true;
  }

  async function handleSubmit() {
    const isValid = handleValidateOrgnr(tempOrgNr);

    if (!isValid) {
      return;
    }

    const { data } = await performLookup();
    if (data?.org) {
      setValue('organisation_lookup_orgnr', data.org.orgNr);
      dataModelBindings.organisation_lookup_name && setValue('organisation_lookup_name', data.org.name);
    }
  }

  function handleClear() {
    setValue('organisation_lookup_orgnr', '');
    dataModelBindings.organisation_lookup_name && setValue('organisation_lookup_name', '');
    setTempOrgNr('');
    setOrgNrErrors(undefined);
  }

  const hasSuccessfullyFetched = !!organisation_lookup_orgnr;

  return (
    <Fieldset
      legend={labelText}
      legendSize='lg'
      description={getDescriptionComponent()}
      help={getHelpTextComponent()}
      size='sm'
    >
      <ComponentStructureWrapper node={node}>
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
          <NumericInput
            id={`${id}_orgnr`}
            aria-describedby={hasSuccessfullyFetched ? getDescriptionId(`${id}_orgnr`) : undefined}
            value={hasSuccessfullyFetched ? organisation_lookup_orgnr : tempOrgNr}
            className={classes.orgnr}
            required={required}
            readOnly={hasSuccessfullyFetched || isFetching}
            error={orgNrErrors?.length && <Lang id={orgNrErrors.join(' ')} />}
            onValueChange={(e) => {
              setTempOrgNr(e.value);
              setOrgNrErrors(undefined);
            }}
            onKeyDown={async (ev) => {
              if (ev.key === 'Enter') {
                await handleSubmit();
              }
            }}
            allowLeadingZeros
            inputMode='numeric'
            pattern='[0-9]{9}'
          />
          <div className={classes.submit}>
            {!hasSuccessfullyFetched ? (
              <Button
                onClick={handleSubmit}
                variant='secondary'
                isLoading={isFetching}
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
          {data?.error && (
            <ErrorMessage
              size='sm'
              className={classes.apiError}
            >
              <Lang id={data.error} />
            </ErrorMessage>
          )}
          {hasSuccessfullyFetched && orgName && (
            <div
              className={classes.orgname}
              aria-label={langAsString('organisation_lookup.org_name')}
            >
              {hasSuccessfullyFetched && <Paragraph size='sm'>{orgName}</Paragraph>}
            </div>
          )}
        </div>
      </ComponentStructureWrapper>
    </Fieldset>
  );
}
