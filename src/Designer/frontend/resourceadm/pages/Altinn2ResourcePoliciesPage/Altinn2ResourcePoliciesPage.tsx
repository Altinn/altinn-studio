import { useEffect, useRef, useState } from 'react';
import {
  mergeActionsFromPolicyWithActionOptions,
  mergeSubjectsFromPolicyWithSubjectOptions,
  PolicyEditor,
  type Policy,
} from '@altinn/policy-editor';
import { useUrlParams } from '../../hooks/useUrlParams';
import { useGetAltinn2ResourcePoliciesQuery } from '../../hooks/queries/useGetAltinn2ResourcePoliciesQuery';
import { getDeprecatedAltinn2SubjectsFromRules } from 'app-shared/utils/altinn2RoleUtils';
import classes from './Altinn2ResourcePoliciesPage.module.css';
import {
  StudioAlert,
  StudioButton,
  StudioDialog,
  StudioHeading,
  StudioSpinner,
  StudioTableLocalPagination,
  StudioToggleGroup,
} from '@studio/components';
import type { ResourceTypeOption } from 'app-shared/types/ResourceAdm';
import {
  useResourceAccessPackagesQuery,
  useResourcePolicyActionsQuery,
  useResourcePolicySubjectsQuery,
} from 'app-shared/hooks/queries';
import { getResourceSubjects } from '../../utils/resourceUtils';
import { usePublishResourcePolicyMutation } from '../../hooks/mutations/usePublishResourcePolicyMutation';
import { getResourceDashboardURL } from '../../utils/urlUtils';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

const ALTINN_APP = 'AltinnApp';
const MIGRATED_APP = 'MigratedApp';

enum EnvId {
  TT02 = 'tt02',
  PROD = 'prod',
}

type TableRowData = {
  identifier: string;
  a2Roles: string[];
  otherRoles: string[];
  policy: Policy;
  resourceType: string;
};

type ResourcePolicyData = {
  identifier?: string;
  policy?: Policy;
  resourceType: string;
};

const getTableData = (resource: ResourcePolicyData) => {
  const subjects = resource.policy?.rules
    .flatMap((rule) => rule.subject)
    .filter((s) => !s.startsWith('urn:altinn:org'))
    .map((s) => s.toLowerCase());
  const a2Subjects = new Set(
    getDeprecatedAltinn2SubjectsFromRules(resource.policy?.rules || []).map((subject) =>
      subject.urn.toLowerCase(),
    ),
  );

  const otherSubjects = [...new Set(subjects)].filter((subject) => !a2Subjects.has(subject));
  const accessPackages = resource.policy?.rules.flatMap((rule) => rule.accessPackages);

  return {
    identifier: resource.identifier,
    resourceType: resource.resourceType,
    a2Roles: [...a2Subjects].sort(),
    otherRoles: [...[...otherSubjects].sort(), ...[...accessPackages].sort()],
    policy: resource.policy,
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

export const ResourcePolicyTable = ({
  data,
  env,
  isOnlyA2Roles,
  onPolicyUpdated,
}: {
  data: TableRowData[];
  env: EnvId;
  isOnlyA2Roles: boolean;
  onPolicyUpdated: (data: ResourcePolicyData) => void;
}) => {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selectedPolicy, setSelectedPolicy] = useState<TableRowData | null>(null);

  const onCloseDialog = () => {
    setSelectedPolicy(null);
    dialogRef.current.close();
  };

  return (
    <div className={isOnlyA2Roles ? classes.onlyA2Subjects : classes.a2subjectsAndOtherSubjects}>
      <StudioTableLocalPagination
        size='small'
        columns={[
          {
            accessor: 'identifier',
            heading: t('resourceadm.altinn2policy_column_identifier'),
            sortable: true,
          },
          {
            accessor: 'a2Roles',
            heading: t('resourceadm.altinn2policy_column_a2_roles'),
            sortable: true,
          },
          {
            accessor: 'otherRoles',
            heading: t('resourceadm.altinn2policy_column_other_roles'),
            sortable: true,
          },
          {
            accessor: 'actions',
            heading: '',
          },
        ]}
        rows={data.map((x) => {
          return {
            id: x.identifier,
            identifier: x.identifier,
            a2Roles: x.a2Roles.join(', '),
            otherRoles: x.otherRoles.join(', '),
            actions: (
              <div>
                {x.resourceType !== ALTINN_APP && (
                  <StudioButton
                    data-size='sm'
                    onClick={() => {
                      dialogRef.current?.showModal();
                      setSelectedPolicy(x);
                    }}
                  >
                    {t('resourceadm.altinn2policy_edit')}
                  </StudioButton>
                )}
              </div>
            ),
          };
        })}
      />
      <StudioDialog ref={dialogRef} placement='right'>
        {selectedPolicy && (
          <LocalPolicyEditor
            tableData={selectedPolicy}
            env={env}
            onClose={onCloseDialog}
            onPolicyUpdated={(updatedData: ResourcePolicyData) => {
              onPolicyUpdated(updatedData);
              onCloseDialog();
            }}
          />
        )}
      </StudioDialog>
    </div>
  );
};

export const LocalPolicyEditor = ({
  tableData,
  env,
  onClose,
  onPolicyUpdated,
}: {
  tableData: TableRowData;
  env: EnvId;
  onClose: () => void;
  onPolicyUpdated: (data: ResourcePolicyData) => void;
}) => {
  const { t } = useTranslation();
  const { org, app } = useUrlParams();
  const [updatedPolicy, setUpdatedPolicy] = useState<Policy>(tableData.policy);

  // Get the data
  const { data: actionData, isPending: isActionPending } = useResourcePolicyActionsQuery(org, app);
  const { data: subjectData, isPending: isSubjectsPending } = useResourcePolicySubjectsQuery(
    org,
    app,
  );
  const { data: accessPackages, isPending: isLoadingAccessPackages } =
    useResourceAccessPackagesQuery(org, app);

  const { mutate: updatePolicyMutation, isError: isUpdatePolicyError } =
    usePublishResourcePolicyMutation(org, app, tableData.identifier);

  const publishNewPolicy = () => {
    updatePolicyMutation(
      { env: env, payload: updatedPolicy },
      {
        onSuccess: () => {
          onPolicyUpdated({
            identifier: tableData.identifier,
            policy: updatedPolicy,
            resourceType: tableData.resourceType,
          });
        },
      },
    );
  };

  const mergedActions = mergeActionsFromPolicyWithActionOptions(
    updatedPolicy.rules,
    actionData || [],
  );
  const subjects = getResourceSubjects(
    [],
    subjectData || [],
    org,
    tableData.resourceType as ResourceTypeOption,
  );
  const mergedSubjects = mergeSubjectsFromPolicyWithSubjectOptions(updatedPolicy.rules, subjects);

  if (isActionPending || isSubjectsPending || isLoadingAccessPackages) {
    return <StudioSpinner aria-label={t('resourceadm.altinn2policy_policy_spinner')} />;
  }

  return (
    <>
      <StudioDialog.Block>
        <PolicyEditor
          policy={updatedPolicy}
          actions={mergedActions}
          subjects={mergedSubjects}
          accessPackages={accessPackages || []}
          resourceId={tableData.identifier}
          onSave={(policy: Policy) => setUpdatedPolicy(policy)}
          showAllErrors={false}
          usageType='resource'
        />
      </StudioDialog.Block>
      <StudioDialog.Block className={classes.buttonRow}>
        <StudioButton onClick={publishNewPolicy}>
          {t('resourceadm.altinn2policy_publish')}
        </StudioButton>
        <StudioButton variant='tertiary' onClick={onClose}>
          {t('resourceadm.altinn2policy_cancel')}
        </StudioButton>
        {isUpdatePolicyError && (
          <StudioAlert data-color='danger'>
            {t('resourceadm.altinn2policy_publish_error')}
          </StudioAlert>
        )}
      </StudioDialog.Block>
    </>
  );
};
