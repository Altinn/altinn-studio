import React from 'react';

import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { Lang } from 'src/features/language/Lang';
import { ComponentValidations } from 'src/features/validation/ComponentValidations';
import { useBindingValidationsFor } from 'src/features/validation/selectors/bindingValidationsForNode';
import classes from 'src/layout/Address/AddressSummary/AddressSummary.module.css';
import { SingleValueSummary } from 'src/layout/Summary2/CommonSummaryComponents/SingleValueSummary';
import { useHasNoDataInBindings } from 'src/layout/Summary2/isEmpty/isEmptyComponent';
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useSummaryOverrides, useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import { useComponentConfig, useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export function AddressSummary({ targetBaseComponentId }: Summary2Props) {
  const config = useComponentConfig(targetBaseComponentId, 'Address');
  const dataModelBindings = useDataModelBindingsFor(targetBaseComponentId, 'Address');
  const required = useEvalExpression(config.required, Expressions.Address.required);
  const resolvedTitle = useEvalExpression(
    config.textResourceBindings?.title,
    Expressions.Address.textResourceBindings.title,
  );
  const resolvedSummaryTitle = useEvalExpression(
    config.textResourceBindings?.summaryTitle,
    Expressions.Address.textResourceBindings.summaryTitle,
  );
  const resolvedCareOfTitle = useEvalExpression(
    config.textResourceBindings?.careOfTitle,
    Expressions.Address.textResourceBindings.careOfTitle,
  );
  const resolvedZipCodeTitle = useEvalExpression(
    config.textResourceBindings?.zipCodeTitle,
    Expressions.Address.textResourceBindings.zipCodeTitle,
  );
  const resolvedPostPlaceTitle = useEvalExpression(
    config.textResourceBindings?.postPlaceTitle,
    Expressions.Address.textResourceBindings.postPlaceTitle,
  );
  const resolvedHouseNumberTitle = useEvalExpression(
    config.textResourceBindings?.houseNumberTitle,
    Expressions.Address.textResourceBindings.houseNumberTitle,
  );

  const title = config.textResourceBindings?.title === undefined ? undefined : resolvedTitle;
  const summaryTitle = config.textResourceBindings?.summaryTitle === undefined ? undefined : resolvedSummaryTitle;
  const careOfTitle = config.textResourceBindings?.careOfTitle === undefined ? undefined : resolvedCareOfTitle;
  const zipCodeTitle = config.textResourceBindings?.zipCodeTitle === undefined ? undefined : resolvedZipCodeTitle;
  const postPlaceTitle = config.textResourceBindings?.postPlaceTitle === undefined ? undefined : resolvedPostPlaceTitle;
  const houseNumberTitle =
    config.textResourceBindings?.houseNumberTitle === undefined ? undefined : resolvedHouseNumberTitle;

  const { formData } = useDataModelBindings(dataModelBindings);
  const { address, postPlace, zipCode, careOf, houseNumber } = formData;
  const emptyFieldText = useSummaryOverrides<'Address'>(targetBaseComponentId)?.emptyFieldText;
  const isCompact = useSummaryProp('isCompact');
  const isEmpty = useHasNoDataInBindings(targetBaseComponentId);

  const bindingValidations = useBindingValidationsFor<'Address'>(targetBaseComponentId);

  return (
    <SummaryFlex
      targetBaseId={targetBaseComponentId}
      content={
        isEmpty
          ? required
            ? SummaryContains.EmptyValueRequired
            : SummaryContains.EmptyValueNotRequired
          : SummaryContains.SomeUserContent
      }
    >
      <div className={classes.addressSummaryComponent}>
        <div>
          <SingleValueSummary
            title={<Lang id={summaryTitle || title || 'address_component.address'} />}
            displayData={address}
            targetBaseComponentId={targetBaseComponentId}
            isCompact={isCompact}
            emptyFieldText={emptyFieldText}
          />
          <ComponentValidations
            validations={bindingValidations?.address}
            baseComponentId={targetBaseComponentId}
          />
        </div>

        {!config.simplified && (
          <div>
            <SingleValueSummary
              title={<Lang id={careOfTitle || 'address_component.care_of'} />}
              displayData={careOf}
              targetBaseComponentId={targetBaseComponentId}
              hideEditButton={true}
              isCompact={isCompact}
              emptyFieldText={emptyFieldText}
            />
            <ComponentValidations
              validations={bindingValidations?.careOf}
              baseComponentId={targetBaseComponentId}
            />
          </div>
        )}

        <div className={classes.addressSummaryComponentZipCode}>
          <div className={classes.addressComponentZipCode}>
            <SingleValueSummary
              title={<Lang id={zipCodeTitle || 'address_component.zip_code'} />}
              displayData={zipCode}
              targetBaseComponentId={targetBaseComponentId}
              hideEditButton={true}
              isCompact={isCompact}
              emptyFieldText={emptyFieldText}
            />
            <ComponentValidations
              validations={bindingValidations?.zipCode}
              baseComponentId={targetBaseComponentId}
            />
          </div>

          <div className={classes.addressSummaryComponentPostplace}>
            <SingleValueSummary
              title={<Lang id={postPlaceTitle || 'address_component.post_place'} />}
              displayData={postPlace}
              targetBaseComponentId={targetBaseComponentId}
              hideEditButton={true}
              isCompact={isCompact}
              emptyFieldText={emptyFieldText}
            />
            <ComponentValidations
              validations={bindingValidations?.postPlace}
              baseComponentId={targetBaseComponentId}
            />
          </div>
          {!config.simplified && (
            <div>
              <SingleValueSummary
                title={<Lang id={houseNumberTitle || 'address_component.house_number'} />}
                displayData={houseNumber}
                targetBaseComponentId={targetBaseComponentId}
                hideEditButton={true}
                isCompact={isCompact}
                emptyFieldText={emptyFieldText}
              />
              <ComponentValidations
                validations={bindingValidations?.houseNumber}
                baseComponentId={targetBaseComponentId}
              />
            </div>
          )}
        </div>
      </div>
    </SummaryFlex>
  );
}
