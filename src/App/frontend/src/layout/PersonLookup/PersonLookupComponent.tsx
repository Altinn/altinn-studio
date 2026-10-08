import React, { useMemo, useState } from 'react';

import {
  Button,
  Description,
  Fieldset,
  getDescriptionId,
  Input,
  Label,
  NumericInput,
  OptionalIndicator,
  RequiredIndicator,
} from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import { Field, ValidationMessage } from '@digdir/designsystemet-react';

import { usePersonLookup } from 'src/core/queries/lookup';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { hasValidationErrors } from 'src/features/validation/utils';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import classes from 'src/layout/PersonLookup/PersonLookupComponent.module.css';
import { validateSsn } from 'src/layout/PersonLookup/validation';
import { buildAriaDescribedBy } from 'src/utils/inputUtils';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useComponentConfig, useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import { useLabel } from 'src/utils/layout/useLabel';
import type { PropsFromGenericComponent } from 'src/layout';

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
  const labelSettings = 'labelSettings' in config ? config.labelSettings : undefined;

  const [tempSsn, setTempSsn] = useState('');
  const [tempName, setTempName] = useState('');
  const [ssnErrors, setSsnErrors] = useState<string[]>();
  const [nameError, setNameError] = useState<string>();

  const validations = useUnifiedValidationsForNode(baseComponentId);
  const ssnValidations = validations.filter((v) => 'bindingKey' in v && v.bindingKey === 'ssn');
  const nameValidations = validations.filter((v) => 'bindingKey' in v && v.bindingKey !== 'ssn');

  const { langAsString } = useLanguage();
  const {
    formData: { ssn, fullName, firstName, lastName },
    setValue,
  } = useDataModelBindings(dataModelBindings);

  const { error: lookupError, lookup: performLookup, isFetching } = usePersonLookup(tempSsn, tempName);

  function handleValidateName(name: string) {
    if (name.length < 1) {
      setNameError('person_lookup.validation_error_name_too_short');
      return false;
    }
    setNameError(undefined);
    return true;
  }

  function handleValidateSsn(ssn: string) {
    if (!validateSsn({ ssn })) {
      const ssnErrors = validateSsn.errors
        ?.filter((error) => error.instancePath === '/ssn')
        .map((error) => error.message)
        .filter((it) => it != null);

      setSsnErrors(ssnErrors);
      return false;
    }

    setSsnErrors(undefined);
    return true;
  }

  async function handleSubmit() {
    const isNameValid = handleValidateName(tempName);
    const isSsnValid = handleValidateSsn(tempSsn);
    if (!isNameValid || !isSsnValid) {
      return;
    }

    const { person } = await performLookup();
    if (person) {
      if (dataModelBindings.ssn) {
        setValue('ssn', person.ssn);
      }
      if (dataModelBindings.firstName) {
        setValue('firstName', person.firstName);
      }
      if (dataModelBindings.lastName) {
        setValue('lastName', person.lastName);
      }
      if (dataModelBindings.middleName) {
        setValue('middleName', person.middleName || '');
      }
      if (dataModelBindings.fullName) {
        setValue('fullName', composeFullName(person));
      }
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
    setSsnErrors(undefined);
    setNameError(undefined);
  }

  const displayName = useMemo(() => {
    // We prefer to not display middle name
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }

    return fullName || '';
  }, [fullName, firstName, lastName]);

  const hasSuccessfullyFetched = !!ssn;

  const invalidSsn = (ssnErrors?.length && ssnErrors?.length > 0) || hasValidationErrors(ssnValidations);
  const invalidName = !!nameError || hasValidationErrors(nameValidations);

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
              optionalIndicator={
                <OptionalIndicator
                  required={required}
                  readOnly={readOnly}
                  showOptionalMarking={labelSettings?.optionalIndicator !== false}
                />
              }
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
              aria-describedby={buildAriaDescribedBy({
                hasTitle: true,
                hasDescription: hasSuccessfullyFetched,
                descriptionId: getDescriptionId(`${componentId}_ssn`),
                hasValidations: validations.length > 0,
                validationsId: `${componentId}-validations`,
              })}
              aria-label={langAsString('person_lookup.ssn_label')}
              value={hasSuccessfullyFetched ? ssn : tempSsn}
              required={required}
              readOnly={hasSuccessfullyFetched || isFetching || readOnly}
              error={invalidSsn}
              onValueChange={(e) => {
                setTempSsn(e.value);
                setSsnErrors(undefined);
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
            {ssnErrors?.length && (
              <ValidationMessage>
                <Lang id={ssnErrors.join(' ')} />
              </ValidationMessage>
            )}
          </Field>
          <div className={classes.nameLabel}>
            <Label
              htmlFor={`${componentId}_name`}
              required={required}
              requiredIndicator={<RequiredIndicator required={required} />}
              optionalIndicator={
                <OptionalIndicator
                  required={required}
                  readOnly={readOnly}
                  showOptionalMarking={labelSettings?.optionalIndicator !== false}
                />
              }
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
              aria-describedby={buildAriaDescribedBy({
                hasTitle: true,
                hasDescription: hasSuccessfullyFetched,
                descriptionId: getDescriptionId(`${componentId}_name`),
                hasValidations: validations.length > 0,
                validationsId: `${componentId}-validations`,
              })}
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
                setNameError(undefined);
              }}
              onKeyDown={async (ev) => {
                if (ev.key === 'Enter' && !readOnly) {
                  await handleSubmit();
                }
              }}
              autoComplete='family-name'
            />
            {nameError && (
              <ValidationMessage>
                <Lang id={nameError} />
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
          {lookupError && (
            <ValidationMessage
              data-size='sm'
              className={classes.apiError}
            >
              <Lang id={lookupError} />
            </ValidationMessage>
          )}
        </div>
      </ComponentStructureWrapper>
    </Fieldset>
  );
}
