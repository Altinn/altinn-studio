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
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface AddressSummaryProps {
  componentNode: LayoutNode<'Address'>;
}

export function AddressSummary({ componentNode }: AddressSummaryProps) {
  const item = useItemWhenType(componentNode.baseId, 'Address');
  const { textResourceBindings, dataModelBindings, simplified, required } = item;
  const { title, careOfTitle, zipCodeTitle, postPlaceTitle, houseNumberTitle } = textResourceBindings ?? {};
  const { formData } = useDataModelBindings(dataModelBindings);
  const { address, postPlace, zipCode, careOf, houseNumber } = formData;
  const emptyFieldText = useSummaryOverrides(componentNode)?.emptyFieldText;
  const isCompact = useSummaryProp('isCompact');
  const isEmpty = useHasNoDataInBindings(componentNode);

  const bindingValidations = useBindingValidationsFor<'Address'>(componentNode.baseId);

  return (
    <SummaryFlex
      target={componentNode}
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
            componentNode={componentNode}
            isCompact={isCompact}
            emptyFieldText={emptyFieldText}
          />
          <ComponentValidations
            validations={bindingValidations?.address}
            baseComponentId={componentNode.baseId}
          />
        </div>

        {!simplified && (
          <div>
            <SingleValueSummary
              title={<Lang id={careOfTitle || 'address_component.care_of'} />}
              displayData={careOf}
              componentNode={componentNode}
              hideEditButton={true}
              isCompact={isCompact}
              emptyFieldText={emptyFieldText}
            />
            <ComponentValidations
              validations={bindingValidations?.careOf}
              baseComponentId={componentNode.baseId}
            />
          </div>
        )}

        <div className={classes.addressSummaryComponentZipCode}>
          <div className={classes.addressComponentZipCode}>
            <SingleValueSummary
              title={<Lang id={zipCodeTitle || 'address_component.zip_code'} />}
              displayData={zipCode}
              componentNode={componentNode}
              hideEditButton={true}
              isCompact={isCompact}
              emptyFieldText={emptyFieldText}
            />
            <ComponentValidations
              validations={bindingValidations?.zipCode}
              baseComponentId={componentNode.baseId}
            />
          </div>

          <div className={classes.addressSummaryComponentPostplace}>
            <SingleValueSummary
              title={<Lang id={postPlaceTitle || 'address_component.post_place'} />}
              displayData={postPlace}
              componentNode={componentNode}
              hideEditButton={true}
              isCompact={isCompact}
              emptyFieldText={emptyFieldText}
            />
            <ComponentValidations
              validations={bindingValidations?.postPlace}
              baseComponentId={componentNode.baseId}
            />
          </div>
          {!simplified && (
            <div>
              <SingleValueSummary
                title={<Lang id={houseNumberTitle || 'address_component.house_number'} />}
                displayData={houseNumber}
                componentNode={componentNode}
                hideEditButton={true}
                isCompact={isCompact}
                emptyFieldText={emptyFieldText}
              />
              <ComponentValidations
                validations={bindingValidations?.houseNumber}
                baseComponentId={componentNode.baseId}
              />
            </div>
          )}
        </div>
      </div>
    </SummaryFlex>
  );
}
