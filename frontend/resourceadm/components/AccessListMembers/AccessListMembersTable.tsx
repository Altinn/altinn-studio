import React from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorMessage, Table } from '@digdir/design-system-react';
import type { AccessListMember } from 'app-shared/types/ResourceAdm';
import { StudioButton } from '@studio/components';
import classes from './AccessListMembers.module.css';
import { PlusCircleIcon, MinusCircleIcon } from '@studio/icons';
import { stringNumberToAriaLabel } from '../../utils/stringUtils';

interface AccessListMembersTableProps {
  listItems: AccessListMember[];
  isLoading: boolean;
  isAdd?: boolean;
  isHeaderHidden?: boolean;
  disabledItems?: AccessListMember[];
  invalidItems?: string[];
  onButtonClick: (member: AccessListMember) => void;
}

export const AccessListMembersTable = ({
  listItems,
  isLoading,
  isAdd,
  isHeaderHidden,
  disabledItems,
  invalidItems,
  onButtonClick,
}: AccessListMembersTableProps): React.JSX.Element => {
  const { t } = useTranslation();

  const renderActionButton = (item: AccessListMember): React.JSX.Element => {
    let buttonAriaLabel: string;
    let buttonIcon: React.JSX.Element;
    let buttonText: string;
    if (invalidItems?.indexOf(item.orgNr) > -1) {
      return <ErrorMessage size='small'>{t('resourceadm.listadmin_invalid_org')}</ErrorMessage>;
    }
    if (isAdd) {
      buttonAriaLabel = t('resourceadm.listadmin_add_to_list_org', { org: item.orgName });
      buttonIcon = <PlusCircleIcon className={classes.buttonIcon} />;
      buttonText = t('resourceadm.listadmin_add_to_list');
    } else {
      buttonAriaLabel = t('resourceadm.listadmin_remove_from_list_org', {
        org: item.orgName,
      });
      buttonIcon = <MinusCircleIcon className={classes.buttonIcon} />;
      buttonText = t('resourceadm.listadmin_remove_from_list');
    }
    return (
      <StudioButton
        aria-label={buttonAriaLabel}
        onClick={() => onButtonClick(item)}
        disabled={
          isLoading ||
          (disabledItems && disabledItems.some((existingItem) => existingItem.orgNr === item.orgNr))
        }
        variant='tertiary'
        size='small'
      >
        {buttonText}
        {buttonIcon}
      </StudioButton>
    );
  };

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
              <Table.Cell
                aria-label={stringNumberToAriaLabel(item.orgNr)}
                className={classes.orgNrCell}
              >
                {item.orgNr}
              </Table.Cell>
              <Table.Cell>{item.orgName || t('resourceadm.listadmin_empty_name')}</Table.Cell>
              <Table.Cell>
                {item.isSubParty
                  ? t('resourceadm.listadmin_sub_party')
                  : t('resourceadm.listadmin_party')}
              </Table.Cell>
              <Table.Cell>{renderActionButton(item)}</Table.Cell>
            </Table.Row>
          );
        })}
      </Table.Body>
    </Table>
  );
};
