import React, { useState } from 'react';

import { Button, Field, Fieldset, Paragraph, Textfield, ValidationMessage } from '@digdir/designsystemet-react';
import { useOrganisationLookup } from 'nextsrc/core/queries/lookup';
import { useComponentBinding, useTextResource } from 'nextsrc/libs/form-client/react/hooks';
import { useLanguage } from 'nextsrc/libs/form-client/react/useLanguage';
import classes from 'nextsrc/libs/form-engine/components/OrganisationLookup/OrganisationLookup.module.css';
import { checkValidOrgNr } from 'nextsrc/libs/form-engine/components/shared/lookupValidation';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';

import type { CompOrganisationLookupExternal } from 'src/layout/OrganisationLookup/config.generated';

export const OrganisationLookup = ({ component, parentBinding, itemIndex }: ComponentProps) => {
  const props = component as CompOrganisationLookupExternal;
  const { langAsString } = useLanguage();

  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const title = useTextResource(titleKey);

  const orgNr = useComponentBinding(props.dataModelBindings?.organisation_lookup_orgnr, parentBinding, itemIndex);
  const orgName = useComponentBinding(props.dataModelBindings?.organisation_lookup_name, parentBinding, itemIndex);

  const [tempOrgNr, setTempOrgNr] = useState('');
  const [orgNrErrors, setOrgNrErrors] = useState<string[]>();

  const { error: lookupError, performLookup, isFetching } = useOrganisationLookup(tempOrgNr);

  function handleValidateOrgNr(value: string): boolean {
    if (!checkValidOrgNr(value)) {
      setOrgNrErrors(['organisation_lookup.validation_error_orgnr']);
      return false;
    }
    setOrgNrErrors(undefined);
    return true;
  }

  async function handleSubmit() {
    if (!handleValidateOrgNr(tempOrgNr)) {
      return;
    }

    const result = await performLookup();
    if (result.org) {
      orgNr.setValue(result.org.orgNr);
      if (orgName.field) {
        orgName.setValue(result.org.name);
      }
    }
  }

  function handleClear() {
    orgNr.setValue('');
    if (orgName.field) {
      orgName.setValue('');
    }
    setTempOrgNr('');
    setOrgNrErrors(undefined);
  }

  const hasSuccessfullyFetched = !!orgNr.value;
  const hasErrors = (orgNrErrors && orgNrErrors.length > 0) || !!lookupError;

  return (
    <Fieldset data-size='sm'>
      {title && <legend>{title}</legend>}
      <div className={classes.componentWrapper}>
        <div className={classes.orgnrLabel}>
          <label htmlFor={`${props.id}_orgnr`}>{langAsString('organisation_lookup.orgnr_label')}</label>
        </div>
        <Field className={classes.orgnr}>
          <Textfield
            id={`${props.id}_orgnr`}
            value={hasSuccessfullyFetched ? String(orgNr.value) : tempOrgNr}
            readOnly={hasSuccessfullyFetched || isFetching}
            error={hasErrors}
            onChange={(e) => {
              setTempOrgNr(e.target.value.replace(/\D/g, ''));
              setOrgNrErrors(undefined);
            }}
            onKeyDown={async (ev) => {
              if (ev.key === 'Enter') {
                await handleSubmit();
              }
            }}
            inputMode='numeric'
            pattern='[0-9]{9}'
            label=''
          />
          {orgNrErrors && orgNrErrors.length > 0 && (
            <ValidationMessage data-size='sm'>{langAsString(orgNrErrors[0])}</ValidationMessage>
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
              {langAsString('organisation_lookup.submit_button')}
            </Button>
          ) : (
            <Button
              variant='secondary'
              data-color='danger'
              onClick={handleClear}
              data-size='sm'
            >
              {langAsString('organisation_lookup.clear_button')}
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
        {hasSuccessfullyFetched && orgName.value && (
          <div
            className={classes.orgname}
            aria-label={langAsString('organisation_lookup.org_name')}
          >
            <Paragraph data-size='sm'>{String(orgName.value)}</Paragraph>
          </div>
        )}
      </div>
    </Fieldset>
  );
};
