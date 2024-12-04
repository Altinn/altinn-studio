import React from 'react';

import { Heading } from '@digdir/designsystemet-react';

import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { Lang } from 'src/features/language/Lang';
import { ComponentValidations } from 'src/features/validation/ComponentValidations';
import { useBindingValidationsForNode } from 'src/features/validation/selectors/bindingValidationsForNode';
import classes from 'src/layout/OrganisationLookup/OrganisationLookupSummary.module.css';
import { SingleValueSummary } from 'src/layout/Summary2/CommonSummaryComponents/SingleValueSummary';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface OrganisationLookupSummaryProps {
  componentNode: LayoutNode<'OrganisationLookup'>;
}

export function OrganisationLookupSummary({ componentNode }: OrganisationLookupSummaryProps) {
  const { dataModelBindings, title } = useNodeItem(componentNode, (i) => ({
    dataModelBindings: i.dataModelBindings,
    title: i.textResourceBindings?.title,
  }));
  const { formData } = useDataModelBindings(dataModelBindings);
  const { organisation_lookup_orgnr, organisation_lookup_name } = formData;

  const bindingValidations = useBindingValidationsForNode(componentNode);

  return (
    <div className={classes.organisationSummaryWrapper}>
      <Heading
        size='sm'
        level={2}
      >
        <Lang
          id={title}
          node={componentNode}
        />
      </Heading>
      <div className={classes.organisationLookupSummary}>
        <div className={classes.organisationLookupSummaryNr}>
          <SingleValueSummary
            title={
              <Lang
                id='organisation_lookup.orgnr_label'
                node={componentNode}
              />
            }
            displayData={organisation_lookup_orgnr}
            componentNode={componentNode}
            hideEditButton={organisation_lookup_name ? true : false}
          />
          <ComponentValidations
            validations={bindingValidations?.organisation_lookup_orgnr}
            node={componentNode}
          />
        </div>
        {organisation_lookup_name && (
          <div className={classes.organisationLookupSummaryName}>
            <SingleValueSummary
              title={
                <Lang
                  id='organisation_lookup.org_name'
                  node={componentNode}
                />
              }
              displayData={organisation_lookup_name}
              componentNode={componentNode}
              hideEditButton={false}
            />
            <ComponentValidations
              validations={bindingValidations?.organisation_lookup_name}
              node={componentNode}
            />
          </div>
        )}
      </div>
    </div>
  );
}
