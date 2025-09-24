import React from 'react';

import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { Lang } from 'src/features/language/Lang';
import { ComponentValidations } from 'src/features/validation/ComponentValidations';
import { useBindingValidationsFor } from 'src/features/validation/selectors/bindingValidationsForNode';
import classes from 'src/layout/Address/AddressSummary/AddressSummary.module.css';
import { SingleValueSummary } from 'src/layout/Summary2/CommonSummaryComponents/SingleValueSummary';
import { useHasNoDataInBindings } from 'src/layout/Summary2/isEmpty/isEmptyComponent';
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useSummaryOverrides, useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export function AddressSummary({ targetBaseComponentId }: Summary2Props) {
  const item = useItemWhenType(targetBaseComponentId, 'Address');
  const { textResourceBindings, dataModelBindings, simplified, required } = item;
  const { title, careOfTitle, zipCodeTitle, postPlaceTitle, houseNumberTitle } = textResourceBindings ?? {};
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
            title={<Lang id={title || 'address_component.address'} />}
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

        {!simplified && (
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
          {!simplified && (
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
