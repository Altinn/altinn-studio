import React, { useMemo, useState } from 'react';

import { Button, Field, Fieldset, Textfield, ValidationMessage } from '@digdir/designsystemet-react';
import { usePersonLookup } from 'nextsrc/core/queries/lookup';
import { useComponentBinding, useTextResource } from 'nextsrc/libs/form-client/react/hooks';
import { useLanguage } from 'nextsrc/libs/form-client/react/useLanguage';
import classes from 'nextsrc/libs/form-engine/components/PersonLookup/PersonLookup.module.css';
import { checkValidSsn } from 'nextsrc/libs/form-engine/components/shared/lookupValidation';
import type { PersonDetails } from 'nextsrc/core/api-client/lookupApi';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';

import type { CompPersonLookupExternal } from 'src/layout/PersonLookup/config.generated';

function composeFullName(person: PersonDetails): string {
  return person.middleName
    ? `${person.firstName} ${person.middleName} ${person.lastName}`
    : `${person.firstName} ${person.lastName}`;
}

export const PersonLookup = ({ component, parentBinding, itemIndex }: ComponentProps) => {
  const props = component as CompPersonLookupExternal;
  const { langAsString } = useLanguage();

  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const title = useTextResource(titleKey);

  const ssn = useComponentBinding(props.dataModelBindings?.person_lookup_ssn, parentBinding, itemIndex);
  const personName = useComponentBinding(props.dataModelBindings?.person_lookup_name, parentBinding, itemIndex);
  const firstName = useComponentBinding(props.dataModelBindings?.person_lookup_first_name, parentBinding, itemIndex);
  const lastName = useComponentBinding(props.dataModelBindings?.person_lookup_last_name, parentBinding, itemIndex);
  const middleName = useComponentBinding(props.dataModelBindings?.person_lookup_middle_name, parentBinding, itemIndex);

  const [tempSsn, setTempSsn] = useState('');
  const [tempName, setTempName] = useState('');
  const [ssnErrors, setSsnErrors] = useState<string[]>();
  const [nameError, setNameError] = useState<string>();

  const { error: lookupError, performLookup, isFetching } = usePersonLookup(tempSsn, tempName);

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

    const result = await performLookup();
    if (result.person) {
      if (ssn.field) {
        ssn.setValue(result.person.ssn);
      }
      if (firstName.field) {
        firstName.setValue(result.person.firstName);
      }
      if (lastName.field) {
        lastName.setValue(result.person.lastName);
      }
      if (middleName.field) {
        middleName.setValue(result.person.middleName || '');
      }
      if (personName.field) {
        personName.setValue(composeFullName(result.person));
      }
    }
  }

  function handleClear() {
    if (ssn.field) {
      ssn.setValue('');
    }
    if (firstName.field) {
      firstName.setValue('');
    }
    if (lastName.field) {
      lastName.setValue('');
    }
    if (middleName.field) {
      middleName.setValue('');
    }
    if (personName.field) {
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
          <label htmlFor={`${props.id}_ssn`}>{langAsString('person_lookup.ssn_label')}</label>
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
            <ValidationMessage data-size='sm'>{langAsString(ssnErrors[0])}</ValidationMessage>
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
          {nameError && <ValidationMessage data-size='sm'>{langAsString(nameError)}</ValidationMessage>}
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
        {lookupError && (
          <ValidationMessage
            data-size='sm'
            className={classes.apiError}
          >
            {langAsString(lookupError)}
          </ValidationMessage>
        )}
      </div>
    </Fieldset>
  );
};
