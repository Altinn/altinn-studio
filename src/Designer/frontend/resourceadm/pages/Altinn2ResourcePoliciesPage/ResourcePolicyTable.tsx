import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PackageIcon, PersonTallShortIcon } from '@navikt/aksel-icons';
import { StudioButton, StudioDialog, StudioTableLocalPagination } from '@studio/components';
import { deprecatedAltinn2Roles } from 'app-shared/utils/altinn2RoleUtils';
import { useResourceAccessPackagesQuery } from 'app-shared/hooks/queries';
import { useUrlParams } from '../../hooks/useUrlParams';
import classes from './Altinn2ResourcePoliciesPage.module.css';
import { AllRoles } from './AllRoles';
import { LocalPolicyEditor } from './LocalPolicyEditor';
import { ALTINN_APP } from './altinn2ResourcePolicyUtils';
import type { EnvId, ResourcePolicyData, TableRowData } from './altinn2ResourcePolicyUtils';

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
  const { org, app } = useUrlParams();
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selectedPolicy, setSelectedPolicy] = useState<TableRowData | null>(null);

  const subjectData = AllRoles;
  const { data: accessPackages } = useResourceAccessPackagesQuery(org, app);

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
          },
          {
            accessor: 'otherRoles',
            heading: t('resourceadm.altinn2policy_column_other_roles'),
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
            a2Roles: (
              <div>
                {x.a2Roles.map((role) => (
                  <div key={`${x.identifier}-${role}`} className={classes.subject}>
                    <PersonTallShortIcon />
                    {deprecatedAltinn2Roles[role] || role}
                  </div>
                ))}
              </div>
            ),
            otherRoles: (
              <div>
                {x.otherRoles.map((role) => {
                  const roleName = subjectData?.find((s) => s.legacyUrn === role)?.name;
                  const accessPackageName = accessPackages
                    ?.flatMap((ap) => ap.areas)
                    .flatMap((area) => area.packages)
                    .find((ap) => ap.urn === role)?.name;

                  if (accessPackageName) {
                    return (
                      <div key={`${x.identifier}-${role}`} className={classes.subject}>
                        <PackageIcon />
                        {accessPackageName || role}
                      </div>
                    );
                  } else {
                    return (
                      <div key={`${x.identifier}-${roleName ?? role}`} className={classes.subject}>
                        <PersonTallShortIcon />
                        {roleName ?? role}
                      </div>
                    );
                  }
                })}
              </div>
            ),
            actions: (
              <div>
                {x.resourceType !== ALTINN_APP && !x.existsInGitea && (
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
                {x.resourceType === ALTINN_APP && t('resourceadm.altinn2policy_approw')}
                {x.existsInGitea && t('resourceadm.altinn2policy_gitearow')}
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
