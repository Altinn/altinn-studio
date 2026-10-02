import React, { useMemo } from 'react';

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

import { usePersonLookup } from 'src/core/queries/lookup';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useLookupInput } from 'src/features/lookup/LookupStore';
import { ValidationMask } from 'src/features/validation';
import { useOnComponentValidation } from 'src/features/validation/callbacks/onComponentValidation';
import { ComponentValidations } from 'src/features/validation/ComponentValidations';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { hasValidationErrors } from 'src/features/validation/utils';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import classes from 'src/layout/PersonLookup/PersonLookupComponent.module.css';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useComponentConfig, useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import { useLabel } from 'src/utils/layout/useLabel';
import type { Person } from 'src/core/queries/lookup';
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
  const { input, setInput, clearInput } = useLookupInput(baseComponentId);
  const tempSsn = input?.type === 'PersonLookup' ? input.ssn : '';
  const tempName = input?.type === 'PersonLookup' ? input.lastName : '';
  const validate = useOnComponentValidation(baseComponentId);
  const validations = useUnifiedValidationsForNode(baseComponentId);
  const ssnValidations = validations.filter((v) => 'bindingKey' in v && v.bindingKey === 'ssn');
  const nameValidations = validations.filter((v) => 'bindingKey' in v && v.bindingKey !== 'ssn');
  const lookupErrors = validations.filter((v) => !('bindingKey' in v));

  const { langAsString } = useLanguage();
  const {
    formData: { ssn, fullName, firstName, lastName },
    setValue,
  } = useDataModelBindings(dataModelBindings);

  const { lookup: performLookup, isFetching } = usePersonLookup(tempSsn, tempName);

  async function handleSubmit() {
    if (readOnly || isFetching || ssn) {
      return;
    }
    setInput({ type: 'PersonLookup', ssn: tempSsn, lastName: tempName });
    // Result bindings are still empty. Only validate the search inputs before the request.
    if ((await validate(ValidationMask.Component)).length) {
      return;
    }

    const { data, failure } = await performLookup();
    if (data) {
      if (dataModelBindings.ssn) {
        setValue('ssn', data.ssn);
      }
      if (dataModelBindings.firstName) {
        setValue('firstName', data.firstName);
      }
      if (dataModelBindings.lastName) {
        setValue('lastName', data.lastName);
      }
      if (dataModelBindings.middleName) {
        setValue('middleName', data.middleName || '');
      }
      if (dataModelBindings.fullName) {
        setValue('fullName', composeFullName(data));
      }
      clearInput();
      await validate();
    } else {
      setInput({ type: 'PersonLookup', ssn: tempSsn, lastName: tempName, failure });
      await validate(ValidationMask.Component);
    }
  }

  function composeFullName({ firstName, middleName, lastName }: Person) {
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

    clearInput();
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
                if (!e.value && !tempName) {
                  clearInput();
                } else {
                  setInput({ type: 'PersonLookup', ssn: e.value, lastName: tempName });
                }
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
                if (!tempSsn && !e.target.value) {
                  clearInput();
                } else {
                  setInput({ type: 'PersonLookup', ssn: tempSsn, lastName: e.target.value });
                }
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
