import React from 'react';

import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { Lang } from 'src/features/language/Lang';
import { ComponentValidations } from 'src/features/validation/ComponentValidations';
import { useBindingValidationsForNode } from 'src/features/validation/selectors/bindingValidationsForNode';
import classes from 'src/layout/Address/AddressSummary/AddressSummary.module.css';
import { SingleValueSummary } from 'src/layout/Summary2/CommonSummaryComponents/SingleValueSummary';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface AddressSummaryProps {
  componentNode: LayoutNode<'Address'>;
}

export function AddressSummary({ componentNode }: AddressSummaryProps) {
  const { textResourceBindings, dataModelBindings, simplified } = useNodeItem(componentNode, (i) => ({
    textResourceBindings: i.textResourceBindings,
    dataModelBindings: i.dataModelBindings,
    simplified: i.simplified,
  }));
  const { title, careOfTitle, zipCodeTitle, postPlaceTitle, houseNumberTitle } = textResourceBindings ?? {};
  const { formData } = useDataModelBindings(dataModelBindings);
  const { address, postPlace, zipCode, careOf, houseNumber } = formData;

  const bindingValidations = useBindingValidationsForNode(componentNode);

  return (
    <div className={classes.addressSummaryComponent}>
      <div>
        <SingleValueSummary
          title={<Lang id={title || 'address_component.address'} />}
          displayData={address}
          componentNode={componentNode}
        />
        <ComponentValidations
          validations={bindingValidations?.address}
          node={componentNode}
        />
      </div>

      {!simplified && (
        <div>
          <SingleValueSummary
            title={<Lang id={careOfTitle || 'address_component.care_of'} />}
            displayData={careOf}
            componentNode={componentNode}
            hideEditButton={true}
          />
          <ComponentValidations
            validations={bindingValidations?.careOf}
            node={componentNode}
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
          />
          <ComponentValidations
            validations={bindingValidations?.zipCode}
            node={componentNode}
          />
        </div>

        <div className={classes.addressSummaryComponentPostplace}>
          <SingleValueSummary
            title={<Lang id={postPlaceTitle || 'address_component.post_place'} />}
            displayData={postPlace}
            componentNode={componentNode}
            hideEditButton={true}
          />
          <ComponentValidations
            validations={bindingValidations?.postPlace}
            node={componentNode}
          />
        </div>
        {!simplified && (
          <div>
            <SingleValueSummary
              title={<Lang id={houseNumberTitle || 'address_component.house_number'} />}
              displayData={houseNumber}
              componentNode={componentNode}
              hideEditButton={true}
            />
            <ComponentValidations
              validations={bindingValidations?.houseNumber}
              node={componentNode}
            />
          </div>
        )}
      </div>
    </div>
  );
}
