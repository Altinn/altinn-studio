import { useEffect, useState } from 'react';
import { useUrlParams } from '../../hooks/useUrlParams';
import { useGetAltinn2ResourcePoliciesQuery } from '../../hooks/queries/useGetAltinn2ResourcePoliciesQuery';
import classes from './Altinn2ResourcePoliciesPage.module.css';
import { StudioAlert, StudioHeading, StudioSpinner, StudioToggleGroup } from '@studio/components';
import { getResourceDashboardURL } from '../../utils/urlUtils';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ResourcePolicyTable } from './ResourcePolicyTable';
import {
  ALTINN_APP,
  EnvId,
  getDeprecatedAltinn2Subjects,
  MIGRATED_APP,
} from './altinn2ResourcePolicyUtils';
import type { ResourcePolicyData, TableRowData } from './altinn2ResourcePolicyUtils';

const getTableData = (resource: ResourcePolicyData): TableRowData => {
  const subjects = resource.policy?.rules
    .flatMap((rule) => rule.subject)
    .filter((s) => !s.startsWith('urn:altinn:org'))
    .map((s) => s.toLowerCase());
  const a2Subjects = new Set(getDeprecatedAltinn2Subjects(resource.policy?.rules || []));

  const otherSubjects = [...new Set(subjects)].filter((subject) => !a2Subjects.has(subject));
  const accessPackages = resource.policy?.rules.flatMap((rule) => rule.accessPackages);

  return {
    ...resource,
    a2Roles: [...a2Subjects].sort(),
    otherRoles: [...[...otherSubjects].sort(), ...[...new Set(accessPackages)].sort()],
  };
};

export const Altinn2ResourcePoliciesPage = () => {
  const { t } = useTranslation();
  const { org, app } = useUrlParams();
  const [env, setEnv] = useState<EnvId>(EnvId.TT02);
  const [splitData, setSplitData] = useState<TableRowData[]>([]);

  const { data: policyData, isLoading, isError } = useGetAltinn2ResourcePoliciesQuery(org, env);

  useEffect(() => {
    if (policyData) {
      setSplitData(policyData.map((resource) => getTableData(resource)));
    }
  }, [policyData]);

  const a2AndOtherRoles = splitData.filter((x) => x.otherRoles.length > 0);
  const onlyA2Roles = splitData.filter((x) => x.otherRoles.length === 0);

  const onPolicyUpdated = (updatedData: ResourcePolicyData) => {
    const newData = getTableData(updatedData);
    setSplitData((oldSplitData) => {
      return oldSplitData.map((x) => (x.identifier === newData.identifier ? newData : x));
    });
  };

  const getResourceTypeCountHeading = (heading: string, policies: TableRowData[]) => {
    const appsCount = policies.filter((x) => x.resourceType === ALTINN_APP).length;
    const migratedAppsCount = policies.filter((x) => x.resourceType === MIGRATED_APP).length;
    const resourcesCount = policies.filter(
      (x) => x.resourceType !== ALTINN_APP && x.resourceType !== MIGRATED_APP,
    ).length;
    return t('resourceadm.altinn2policy_heading_count', {
      heading,
      appsCount,
      migratedAppsCount,
      resourcesCount,
    });
  };

  return (
    <div className={classes.wrapper}>
      <span>
        <Link to={getResourceDashboardURL(org, app)}>{t('resourceadm.listadmin_back')}</Link>
      </span>
      <StudioHeading level={1} data-size='lg'>
        {t('resourceadm.altinn2policy_heading')}
      </StudioHeading>
      <StudioToggleGroup
        data-toggle-group='envSelect'
        value={env}
        onChange={(newValue: string) => setEnv(newValue as EnvId)}
      >
        <StudioToggleGroup.Item value={EnvId.TT02}>
          {t('resourceadm.altinn2policy_env_tt02')}
        </StudioToggleGroup.Item>
        <StudioToggleGroup.Item value={EnvId.PROD}>
          {t('resourceadm.altinn2policy_env_prod')}
        </StudioToggleGroup.Item>
      </StudioToggleGroup>
      {isLoading ? (
        <StudioSpinner aria-label={t('resourceadm.altinn2policy_spinner')} />
      ) : (
        <>
          {isError ? (
            <StudioAlert data-color='danger'>
              {t('resourceadm.altinn2policy_load_error')}
            </StudioAlert>
          ) : (
            <>
              <StudioHeading level={2}>
                {getResourceTypeCountHeading(
                  t('resourceadm.altinn2policy_only_a2_roles_heading'),
                  onlyA2Roles,
                )}
              </StudioHeading>
              {onlyA2Roles.length === 0 ? (
                <StudioAlert data-color='success'>
                  {t('resourceadm.altinn2policy_only_a2_roles_empty')}
                </StudioAlert>
              ) : (
                <ResourcePolicyTable
                  data={onlyA2Roles}
                  isOnlyA2Roles={true}
                  env={env}
                  onPolicyUpdated={onPolicyUpdated}
                />
              )}
              <StudioHeading level={2}>
                {getResourceTypeCountHeading(
                  t('resourceadm.altinn2policy_a2_and_other_roles_heading'),
                  a2AndOtherRoles,
                )}
              </StudioHeading>
              {a2AndOtherRoles.length === 0 ? (
                <StudioAlert data-color='success'>
                  {t('resourceadm.altinn2policy_a2_and_other_roles_empty')}
                </StudioAlert>
              ) : (
                <ResourcePolicyTable
                  data={a2AndOtherRoles}
                  isOnlyA2Roles={false}
                  env={env}
                  onPolicyUpdated={onPolicyUpdated}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};
