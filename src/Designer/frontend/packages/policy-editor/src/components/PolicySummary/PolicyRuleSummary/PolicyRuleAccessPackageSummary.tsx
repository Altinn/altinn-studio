import React, { useMemo } from 'react';
import { usePolicyEditorContext } from '../../../contexts/PolicyEditorContext';
import { StudioTable, StudioTag } from '@studio/components-legacy';
import {
  getAccessPackageDisplayName,
  mapActionsForRoleOrAccessPackage,
} from '../../../utils/AppPolicyUtils';
import { useTranslation } from 'react-i18next';
import classes from './PolicyRuleSubjectSummary.module.css';
import { ArrayUtils } from 'libs/studio-pure-functions/src';
import { groupAccessPackagesByArea } from '../../PolicyCardRules/PolicyRule/PolicyAccessPackages/policyAccessPackageUtils';

export type PolicyRuleAccessPackageSummaryProps = {
  accessPackage: string;
  actions: string[];
};

export const PolicyRuleAccessPackageSummary = ({
  accessPackage,
  actions,
}: PolicyRuleAccessPackageSummaryProps): React.ReactNode => {
  const { usageType, accessPackages, policyRules } = usePolicyEditorContext();
  const { t } = useTranslation();
  const groupedAccessPackagesByArea = useMemo(() => {
    return groupAccessPackagesByArea(accessPackages);
  }, [accessPackages]);

  const actionsForAccessPackage = mapActionsForRoleOrAccessPackage(
    policyRules,
    accessPackage,
    usageType,
    t,
    true,
  );

  const displayName = getAccessPackageDisplayName(accessPackage, groupedAccessPackagesByArea);

  return (
    <StudioTable.Row>
      <StudioTable.Cell>{accessPackage}</StudioTable.Cell>
      <StudioTable.Cell>{displayName}</StudioTable.Cell>
      <StudioTable.Cell>{t('policy_editor.role_category.access_package')}</StudioTable.Cell>
      {actions.map((action) => {
        return (
          <StudioTable.Cell key={action}>
            <div className={classes.limitationsCell}>
              {actionsForAccessPackage[action]
                ? ArrayUtils.getArrayFromString(actionsForAccessPackage[action]).map(
                    (subResource) => {
                      return (
                        <StudioTag
                          size='sm'
                          key={`${accessPackage}-${action}-${subResource}`}
                          color='info'
                        >
                          {subResource}
                        </StudioTag>
                      );
                    },
                  )
                : '-'}
            </div>
          </StudioTable.Cell>
        );
      })}
    </StudioTable.Row>
  );
};
