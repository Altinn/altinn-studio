import React from 'react';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';
import { ErrorMessage } from '@digdir/design-system-react';
import type { AccessListMember } from 'app-shared/types/ResourceAdm';
import { StudioButton, StudioTableLocalPagination } from '@studio/components';
import type { Columns } from '@studio/components';
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

  const renderActionButton = (item: AccessListMember): React.ReactNode => {
    let buttonAriaLabel: string;
    let buttonIcon: React.JSX.Element;
    let buttonText: string;
    if (invalidItems?.indexOf(item.orgNr) > -1) {
      return <ErrorMessage size='small'>{t('resourceadm.listadmin_invalid_org')}</ErrorMessage>;
    }
    const orgAriaString = `${item.orgName} ${stringNumberToAriaLabel(item.orgNr)}`;
    if (isAdd) {
      buttonAriaLabel = t('resourceadm.listadmin_add_to_list_org', { org: orgAriaString });
      buttonIcon = <PlusCircleIcon className={classes.buttonIcon} />;
      buttonText = t('resourceadm.listadmin_add_to_list');
    } else {
      buttonAriaLabel = t('resourceadm.listadmin_remove_from_list_org', {
        org: orgAriaString,
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

  const listItemsToRender = listItems.map((x) => {
    return {
      ...x,
      id: x.orgNr,
      links: renderActionButton(x),
    };
  });

  const hiddenHeaderClassName = isHeaderHidden ? classes.hiddenHeader : '';

  const columns: Columns = [
    {
      accessor: 'id',
      heading: t('resourceadm.listadmin_orgnr'),
      bodyCellClass: classes.orgNrCell,
      headerCellClass: cn(hiddenHeaderClassName, classes.smallColumn),
      bodyCellFormatter: (value: string) => (
        <>
          <div className='sr-only'>{stringNumberToAriaLabel(value)}</div>
          <div aria-hidden='true'>{value}</div>
        </>
      ),
    },
    {
      accessor: 'orgName',
      heading: t('resourceadm.listadmin_navn'),
      headerCellClass: cn(hiddenHeaderClassName, classes.largeColumn),
      bodyCellFormatter: (value: string) => value || t('resourceadm.listadmin_empty_name'),
    },
    {
      accessor: 'isSubParty',
      heading: t('resourceadm.listadmin_type'),
      headerCellClass: cn(hiddenHeaderClassName, classes.smallColumn),
      bodyCellFormatter: (isSubParty: boolean) =>
        isSubParty ? t('resourceadm.listadmin_sub_party') : t('resourceadm.listadmin_party'),
    },
    {
      accessor: 'links',
      heading: '',
      headerCellClass: cn(hiddenHeaderClassName, classes.mediumColumn),
    },
  ];
  return <StudioTableLocalPagination columns={columns} size='small' rows={listItemsToRender} />;
};
