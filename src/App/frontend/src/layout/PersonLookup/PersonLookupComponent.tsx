import React, { useMemo, useState } from 'react';

import {
  Button,
  Description,
  Fieldset,
  getDescriptionId,
  Input,
  Label,
  NumericInput,
  RequiredIndicator,
} from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import { Field } from '@digdir/designsystemet-react';
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { queryOptions, useQuery } from '@tanstack/react-query';

import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { ValidationMask } from 'src/features/validation';
import { useOnComponentValidation } from 'src/features/validation/callbacks/onComponentValidation';
import { ComponentValidations } from 'src/features/validation/ComponentValidations';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { hasValidationErrors } from 'src/features/validation/utils';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { lookupValidation } from 'src/layout/lookupValidation';
import classes from 'src/layout/PersonLookup/PersonLookupComponent.module.css';
import { validatePersonLookupInput, validatePersonLookupResponse } from 'src/layout/PersonLookup/validation';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useComponentConfig, useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import { useLabel } from 'src/utils/layout/useLabel';
import { httpPost } from 'src/utils/network/networking';
import { appPath } from 'src/utils/urls/appUrlHelper';
import type { PropsFromGenericComponent } from 'src/layout';

const personLookupQueries = {
  lookup: (ssn: string, name: string) =>
    queryOptions({
      queryKey: [{ scope: 'personLookup', ssn, name }],
      queryFn: () => fetchPerson(ssn, name),
      enabled: false,
      gcTime: 0,
    }),
};

export type Person = {
  firstName: string;
  lastName: string;
  middleName: string;
  ssn: string;
};
export type PersonLookupResponse = { success: false; personDetails: null } | { success: true; personDetails: Person };

async function fetchPerson(
  ssn: string,
  name: string,
): Promise<{ person: Person; error: null } | { person: null; error: string }> {
  if (!ssn || !name) {
    throw new Error('Missing ssn or name');
  }
  const body = { socialSecurityNumber: ssn, lastName: name };
  const url = `${appPath}/api/v1/lookup/person`;

  try {
    const response = await httpPost(url, undefined, body);
    const data = response.data;

    if (!validatePersonLookupResponse(data)) {
      return { person: null, error: 'person_lookup.validation_invalid_response_from_server' };
    }

    if (!data.success) {
      return { person: null, error: 'person_lookup.validation_error_not_found' };
    }

    return { person: data.personDetails, error: null };
  } catch (error) {
    if (error.response?.status === 403) {
      return { person: null, error: 'person_lookup.validation_error_forbidden' };
    }
    if (error.response?.status === 429) {
      return { person: null, error: 'person_lookup.validation_error_too_many_requests' };
    }

    return { person: null, error: 'person_lookup.unknown_error' };
  }
}

export function PersonLookupComponent({ baseComponentId, overrideDisplay }: PropsFromGenericComponent<'PersonLookup'>) {
  const config = useComponentConfig(baseComponentId, 'PersonLookup');
  const dataModelBindings = useDataModelBindingsFor(baseComponentId, 'PersonLookup');
  const componentId = useIndexedId(baseComponentId);
  const required = useEvalExpression(config.required, Expressions.PersonLookup.required);
  const readOnly = useEvalExpression(config.readOnly, Expressions.PersonLookup.readOnly);

  const { labelText, getDescriptionComponent, getHelpTextComponent } = useLabel({
    baseComponentId,
    overrideDisplay,
  });
  const [tempSsn, setTempSsn] = useState('');
  const [tempName, setTempName] = useState('');
  const { updateValidations, validate } = useOnComponentValidation(baseComponentId);
  const validations = useUnifiedValidationsForNode(baseComponentId);
  const ssnValidations = validations.filter((v) => 'bindingKey' in v && v.bindingKey === 'ssn');
  const nameValidations = validations.filter((v) => 'bindingKey' in v && v.bindingKey !== 'ssn');
  const lookupErrors = validations.filter((v) => !('bindingKey' in v));

  const { langAsString } = useLanguage();
  const {
    formData: { ssn, fullName, firstName, lastName },
    setValue,
  } = useDataModelBindings(dataModelBindings);

  const { refetch: performLookup, isFetching } = useQuery(personLookupQueries.lookup(tempSsn, tempName));

  async function handleSubmit() {
    if (readOnly || isFetching || ssn) {
      return;
    }
    updateValidations(() => validatePersonLookupInput(tempSsn, tempName));
    // Result bindings are still empty. Only validate the search inputs before the request.
    if ((await validate(ValidationMask.Component)).length) {
      return;
    }

    const { data } = await performLookup();
    if (data?.person) {
      if (dataModelBindings.ssn) {
        setValue('ssn', data.person.ssn);
      }
      if (dataModelBindings.firstName) {
        setValue('firstName', data.person.firstName);
      }
      if (dataModelBindings.lastName) {
        setValue('lastName', data.person.lastName);
      }
      if (dataModelBindings.middleName) {
        setValue('middleName', data.person.middleName || '');
      }
      if (dataModelBindings.fullName) {
        setValue('fullName', composeFullName(data.person));
      }
      await validate();
    } else if (data?.error) {
      updateValidations(() => [lookupValidation(data.error)]);
      await validate(ValidationMask.Component);
    }
  }

  function composeFullName({ firstName, middleName, lastName }) {
    return middleName ? `${firstName} ${middleName} ${lastName}` : `${firstName} ${lastName}`;
  }

  function handleClear() {
    if (dataModelBindings.ssn) {
      setValue('ssn', '');
    }
    if (dataModelBindings.firstName) {
      setValue('firstName', '');
    }
    if (dataModelBindings.lastName) {
      setValue('lastName', '');
    }
    if (dataModelBindings.middleName) {
      setValue('middleName', '');
    }
    if (dataModelBindings.fullName) {
      setValue('fullName', '');
    }

    setTempName('');
    setTempSsn('');
    updateValidations(() => []);
  }

  const displayName = useMemo(() => {
    // We prefer to not display middle name
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }

    return fullName || '';
  }, [fullName, firstName, lastName]);

  const hasSuccessfullyFetched = !!ssn;

  const invalidSsn = hasValidationErrors(ssnValidations);
  const invalidName = hasValidationErrors(nameValidations);

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
          <div className={classes.ssnLabel}>
            <Label
              htmlFor={`${componentId}_ssn`}
              label={langAsString('person_lookup.ssn_label')}
              required={required}
              requiredIndicator={<RequiredIndicator required={required} />}
              description={
                hasSuccessfullyFetched ? (
                  <Description
                    description={langAsString('person_lookup.from_registry_description')}
                    componentId={`${componentId}_ssn`}
                  />
                ) : undefined
              }
            />
          </div>
          <Field className={classes.ssn}>
            <NumericInput
              id={`${componentId}_ssn`}
              aria-describedby={hasSuccessfullyFetched ? getDescriptionId(`${componentId}_ssn`) : undefined}
              aria-label={langAsString('person_lookup.ssn_label')}
              value={hasSuccessfullyFetched ? ssn : tempSsn}
              required={required}
              readOnly={hasSuccessfullyFetched || isFetching || readOnly}
              error={invalidSsn}
              onValueChange={(e) => {
                setTempSsn(e.value);
                updateValidations((errors) => errors.filter((error) => error.bindingKey && error.bindingKey !== 'ssn'));
              }}
              onKeyDown={async (ev) => {
                if (ev.key === 'Enter' && !readOnly) {
                  await handleSubmit();
                }
              }}
              allowLeadingZeros
              inputMode='numeric'
              pattern='[0-9]{11}'
              autoComplete='off'
            />
            <ComponentValidations
              id={`${componentId}-ssn-validations`}
              validations={ssnValidations}
              baseComponentId={baseComponentId}
            />
          </Field>
          <div className={classes.nameLabel}>
            <Label
              htmlFor={`${componentId}_name`}
              required={required}
              requiredIndicator={<RequiredIndicator required={required} />}
              label={langAsString(hasSuccessfullyFetched ? 'person_lookup.name_label' : 'person_lookup.surname_label')}
              description={
                hasSuccessfullyFetched ? (
                  <Description
                    description={langAsString('person_lookup.from_registry_description')}
                    componentId={`${componentId}_name`}
                  />
                ) : undefined
              }
            />
          </div>
          <Field className={classes.name}>
            <Input
              id={`${componentId}_name`}
              aria-describedby={hasSuccessfullyFetched ? getDescriptionId(`${componentId}_name`) : undefined}
              aria-label={langAsString(
                hasSuccessfullyFetched ? 'person_lookup.name_label' : 'person_lookup.surname_label',
              )}
              value={hasSuccessfullyFetched ? displayName : tempName}
              type='text'
              required={required}
              readOnly={hasSuccessfullyFetched || isFetching || readOnly}
              error={invalidName}
              onChange={(e) => {
                setTempName(e.target.value);
                updateValidations((errors) => errors.filter((error) => error.bindingKey === 'ssn'));
              }}
              onKeyDown={async (ev) => {
                if (ev.key === 'Enter' && !readOnly) {
                  await handleSubmit();
                }
              }}
              autoComplete='family-name'
            />
            <ComponentValidations
              id={`${componentId}-name-validations`}
              validations={nameValidations}
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
                  <Lang id='person_lookup.submit_button' />
                </Button>
              ) : (
                <Button
                  variant='secondary'
                  color='danger'
                  onClick={handleClear}
                >
                  <Lang id='person_lookup.clear_button' />
                </Button>
              )}
            </div>
          )}
          <div className={classes.apiError}>
            <ComponentValidations
              validations={lookupErrors}
              baseComponentId={baseComponentId}
            />
          </div>
        </div>
      </ComponentStructureWrapper>
    </Fieldset>
  );
}
