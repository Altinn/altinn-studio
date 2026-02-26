import React, { useMemo, useState } from 'react';

import {
  Button,
  Field,
  Fieldset,
  Textfield,
  ValidationMessage,
} from '@digdir/designsystemet-react';
import { queryOptions, useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';

import { LookupApi } from 'nextsrc/core/apiClient/lookupApi';
import type { PersonDetails } from 'nextsrc/core/apiClient/lookupApi';
import { useBoundValue, useTextResource } from 'nextsrc/libs/form-client/react/hooks';
import { useLanguage } from 'nextsrc/libs/form-client/react/useLanguage';
import { extractField } from 'nextsrc/libs/form-client/resolveBindings';
import { checkValidSsn } from 'nextsrc/libs/form-engine/components/shared/lookupValidation';
import classes from 'nextsrc/libs/form-engine/components/PersonLookup/PersonLookup.module.css';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';

import type { CompPersonLookupExternal } from 'src/layout/PersonLookup/config.generated';

function composeFullName(person: PersonDetails): string {
  return person.middleName
    ? `${person.firstName} ${person.middleName} ${person.lastName}`
    : `${person.firstName} ${person.lastName}`;
}

const personLookupQueries = {
  lookup: (ssn: string, name: string) =>
    queryOptions({
      queryKey: [{ scope: 'personLookup', ssn, name }],
      queryFn: async () => {
        try {
          const response = await LookupApi.lookupPerson(ssn, name);
          if (!response.success || !response.personDetails) {
            return { person: null, error: 'person_lookup.validation_error_not_found' } as const;
          }
          return { person: response.personDetails, error: null } as const;
        } catch (error) {
          if (error instanceof AxiosError) {
            if (error.response?.status === 403) {
              return { person: null, error: 'person_lookup.validation_error_forbidden' } as const;
            }
            if (error.response?.status === 429) {
              return { person: null, error: 'person_lookup.validation_error_too_many_requests' } as const;
            }
          }
          return { person: null, error: 'person_lookup.unknown_error' } as const;
        }
      },
      enabled: false,
      gcTime: 0,
    }),
};

export const PersonLookup = ({ component, parentBinding, itemIndex }: ComponentProps) => {
  const props = component as CompPersonLookupExternal;
  const { langAsString } = useLanguage();

  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const title = useTextResource(titleKey);

  const ssnField = extractField(props.dataModelBindings?.person_lookup_ssn);
  const nameField = extractField(props.dataModelBindings?.person_lookup_name);
  const firstNameField = extractField(props.dataModelBindings?.person_lookup_first_name);
  const lastNameField = extractField(props.dataModelBindings?.person_lookup_last_name);
  const middleNameField = extractField(props.dataModelBindings?.person_lookup_middle_name);

  const ssn = useBoundValue(ssnField, parentBinding, itemIndex);
  const personName = useBoundValue(nameField, parentBinding, itemIndex);
  const firstName = useBoundValue(firstNameField, parentBinding, itemIndex);
  const lastName = useBoundValue(lastNameField, parentBinding, itemIndex);
  const middleName = useBoundValue(middleNameField, parentBinding, itemIndex);

  const [tempSsn, setTempSsn] = useState('');
  const [tempName, setTempName] = useState('');
  const [ssnErrors, setSsnErrors] = useState<string[]>();
  const [nameError, setNameError] = useState<string>();

  const { data, refetch: performLookup, isFetching } = useQuery(personLookupQueries.lookup(tempSsn, tempName));

  function handleValidateSsn(value: string): boolean {
    if (!checkValidSsn(value)) {
      setSsnErrors(['person_lookup.validation_error_ssn']);
      return false;
    }
    setSsnErrors(undefined);
    return true;
  }

  function handleValidateName(value: string): boolean {
    if (value.length < 1) {
      setNameError('person_lookup.validation_error_name_too_short');
      return false;
    }
    setNameError(undefined);
    return true;
  }

  async function handleSubmit() {
    const isNameValid = handleValidateName(tempName);
    const isSsnValid = handleValidateSsn(tempSsn);
    if (!isNameValid || !isSsnValid) {
      return;
    }

    const { data } = await performLookup();
    if (data?.person) {
      if (ssnField) {
        ssn.setValue(data.person.ssn);
      }
      if (firstNameField) {
        firstName.setValue(data.person.firstName);
      }
      if (lastNameField) {
        lastName.setValue(data.person.lastName);
      }
      if (middleNameField) {
        middleName.setValue(data.person.middleName || '');
      }
      if (nameField) {
        personName.setValue(composeFullName(data.person));
      }
    }
  }

  function handleClear() {
    if (ssnField) {
      ssn.setValue('');
    }
    if (firstNameField) {
      firstName.setValue('');
    }
    if (lastNameField) {
      lastName.setValue('');
    }
    if (middleNameField) {
      middleName.setValue('');
    }
    if (nameField) {
      personName.setValue('');
    }
    setTempName('');
    setTempSsn('');
    setSsnErrors(undefined);
    setNameError(undefined);
  }

  const displayName = useMemo(() => {
    if (firstName.value && lastName.value) {
      return `${firstName.value} ${lastName.value}`;
    }
    return String(personName.value || '');
  }, [personName.value, firstName.value, lastName.value]);

  const hasSuccessfullyFetched = !!ssn.value;
  const invalidSsn = !!(ssnErrors && ssnErrors.length > 0);
  const invalidName = !!nameError;

  return (
    <Fieldset data-size='sm'>
      {title && <legend>{title}</legend>}
      <div className={classes.componentWrapper}>
        <div className={classes.ssnLabel}>
          <label htmlFor={`${props.id}_ssn`}>
            {langAsString('person_lookup.ssn_label')}
          </label>
        </div>
        <Field className={classes.ssn}>
          <Textfield
            id={`${props.id}_ssn`}
            value={hasSuccessfullyFetched ? String(ssn.value) : tempSsn}
            readOnly={hasSuccessfullyFetched}
            error={invalidSsn}
            onChange={(e) => {
              setTempSsn(e.target.value.replace(/\D/g, ''));
              setSsnErrors(undefined);
            }}
            onKeyDown={async (ev) => {
              if (ev.key === 'Enter') {
                await handleSubmit();
              }
            }}
            inputMode='numeric'
            pattern='[0-9]{11}'
            autoComplete='off'
            label=''
          />
          {ssnErrors && ssnErrors.length > 0 && (
            <ValidationMessage data-size='sm'>
              {langAsString(ssnErrors[0])}
            </ValidationMessage>
          )}
        </Field>
        <div className={classes.nameLabel}>
          <label htmlFor={`${props.id}_name`}>
            {langAsString(hasSuccessfullyFetched ? 'person_lookup.name_label' : 'person_lookup.surname_label')}
          </label>
        </div>
        <Field className={classes.name}>
          <Textfield
            id={`${props.id}_name`}
            value={hasSuccessfullyFetched ? displayName : tempName}
            readOnly={hasSuccessfullyFetched}
            error={invalidName}
            onChange={(e) => {
              setTempName(e.target.value);
              setNameError(undefined);
            }}
            onKeyDown={async (ev) => {
              if (ev.key === 'Enter') {
                await handleSubmit();
              }
            }}
            autoComplete='family-name'
            label=''
          />
          {nameError && (
            <ValidationMessage data-size='sm'>
              {langAsString(nameError)}
            </ValidationMessage>
          )}
        </Field>
        <div className={classes.submit}>
          {!hasSuccessfullyFetched ? (
            <Button
              onClick={handleSubmit}
              variant='secondary'
              loading={isFetching}
              data-size='sm'
            >
              {langAsString('person_lookup.submit_button')}
            </Button>
          ) : (
            <Button
              variant='secondary'
              data-color='danger'
              onClick={handleClear}
              data-size='sm'
            >
              {langAsString('person_lookup.clear_button')}
            </Button>
          )}
        </div>
        {data?.error && (
          <ValidationMessage
            data-size='sm'
            className={classes.apiError}
          >
            {langAsString(data.error)}
          </ValidationMessage>
        )}
      </div>
    </Fieldset>
  );
};
