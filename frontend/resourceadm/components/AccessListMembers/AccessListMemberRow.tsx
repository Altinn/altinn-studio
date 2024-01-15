import React from 'react';
import { useTranslation } from 'react-i18next';
import { TableRow, TableCell } from '@digdir/design-system-react';
import { AccessListMember } from 'app-shared/types/ResourceAdm';

interface AccessListMemberRowProps {
  item: AccessListMember;
  actionButton: React.ReactNode;
}

export const AccessListMemberRow = ({
  item,
  actionButton,
}: AccessListMemberRowProps): JSX.Element => {
  const { t } = useTranslation();
  return (
    <TableRow>
      <TableCell>{item.orgNr}</TableCell>
      <TableCell>{item.orgName || t('resourceadm.listadmin_empty_name')}</TableCell>
      <TableCell>
        {item.isSubParty ? t('resourceadm.listadmin_sub_party') : t('resourceadm.listadmin_party')}
      </TableCell>
      <TableCell>{actionButton}</TableCell>
    </TableRow>
  );
};
