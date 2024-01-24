import React from 'react';
import { useTranslation } from 'react-i18next';
import { Table } from '@digdir/design-system-react';
import type { AccessListMember } from 'app-shared/types/ResourceAdm';
import { StudioButton } from '@studio/components';
import classes from './AccessListMembers.module.css';

interface AccessListMembersTableProps {
  listItems: AccessListMember[];
  buttonNode: React.JSX.Element;
  isHeaderHidden?: boolean;
  disableButtonFn?: (member: AccessListMember) => boolean;
  onButtonClick: (member: AccessListMember) => void;
}

export const AccessListMembersTable = ({
  listItems,
  buttonNode,
  isHeaderHidden,
  disableButtonFn,
  onButtonClick,
}: AccessListMembersTableProps): React.JSX.Element => {
  const { t } = useTranslation();

  return (
    <Table size='small' className={classes.membersTable}>
      <Table.Head className={isHeaderHidden ? classes.hiddenHeader : undefined}>
        <Table.Row>
          <Table.HeaderCell className={classes.smallColumn}>
            {t('resourceadm.listadmin_orgnr')}
          </Table.HeaderCell>
          <Table.HeaderCell className={classes.largeColumn}>
            {t('resourceadm.listadmin_navn')}
          </Table.HeaderCell>
          <Table.HeaderCell className={classes.smallColumn}>
            {t('resourceadm.listadmin_type')}
          </Table.HeaderCell>
          <Table.HeaderCell className={classes.mediumColumn} />
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {listItems.map((item) => {
          return (
            <Table.Row key={item.orgNr}>
              <Table.Cell>{item.orgNr}</Table.Cell>
              <Table.Cell>{item.orgName || t('resourceadm.listadmin_empty_name')}</Table.Cell>
              <Table.Cell>
                {item.isSubParty
                  ? t('resourceadm.listadmin_sub_party')
                  : t('resourceadm.listadmin_party')}
              </Table.Cell>
              <Table.Cell>
                <StudioButton
                  onClick={() => onButtonClick(item)}
                  disabled={disableButtonFn ? disableButtonFn(item) : false}
                  variant='tertiary'
                  size='small'
                >
                  {buttonNode}
                </StudioButton>
              </Table.Cell>
            </Table.Row>
          );
        })}
      </Table.Body>
    </Table>
  );
};
