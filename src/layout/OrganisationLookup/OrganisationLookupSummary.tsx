import React from 'react';

import { Heading } from '@digdir/designsystemet-react';

import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { Lang } from 'src/features/language/Lang';
import { ComponentValidations } from 'src/features/validation/ComponentValidations';
import { useBindingValidationsForNode } from 'src/features/validation/selectors/bindingValidationsForNode';
import classes from 'src/layout/OrganisationLookup/OrganisationLookupSummary.module.css';
import { SingleValueSummary } from 'src/layout/Summary2/CommonSummaryComponents/SingleValueSummary';
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useSummaryOverrides, useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface OrganisationLookupSummaryProps {
  componentNode: LayoutNode<'OrganisationLookup'>;
}

export function OrganisationLookupSummary({ componentNode }: OrganisationLookupSummaryProps) {
  const { dataModelBindings, textResourceBindings, required } = useItemWhenType(
    componentNode.baseId,
    'OrganisationLookup',
  );
  const title = textResourceBindings?.title;
  const { formData } = useDataModelBindings(dataModelBindings);
  const { organisation_lookup_orgnr, organisation_lookup_name } = formData;
  const emptyFieldText = useSummaryOverrides(componentNode)?.emptyFieldText;
  const isCompact = useSummaryProp('isCompact');
  const bindingValidations = useBindingValidationsForNode(componentNode);
  const isEmpty = !(organisation_lookup_orgnr || organisation_lookup_name);

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
      <div className={classes.organisationSummaryWrapper}>
        <Heading
          data-size='sm'
          level={2}
        >
          <Lang id={title} />
        </Heading>
        <div className={classes.organisationLookupSummary}>
          <div className={classes.organisationLookupSummaryNr}>
            <SingleValueSummary
              title={<Lang id='organisation_lookup.orgnr_label' />}
              displayData={organisation_lookup_orgnr}
              componentNode={componentNode}
              hideEditButton={organisation_lookup_name ? true : false}
              isCompact={isCompact}
              emptyFieldText={emptyFieldText}
            />
            <ComponentValidations
              validations={bindingValidations?.organisation_lookup_orgnr}
              node={componentNode}
            />
          </div>
          {organisation_lookup_name && (
            <div className={classes.organisationLookupSummaryName}>
              <SingleValueSummary
                title={<Lang id='organisation_lookup.org_name' />}
                displayData={organisation_lookup_name}
                componentNode={componentNode}
                hideEditButton={false}
                isCompact={isCompact}
                emptyFieldText={emptyFieldText}
              />
              <ComponentValidations
                validations={bindingValidations?.organisation_lookup_name}
                node={componentNode}
              />
            </div>
          )}
        </div>
      </div>
    </SummaryFlex>
  );
}
