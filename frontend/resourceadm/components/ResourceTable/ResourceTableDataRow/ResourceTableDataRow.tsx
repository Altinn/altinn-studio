import React from 'react';
import classes from './ResourceTableDataRow.module.css';
import { ResourceTableDataChip } from './ResourceTableDataChip';
import { Button } from '@digdir/design-system-react';
import { PencilWritingIcon, MenuElipsisVerticalIcon } from '@navikt/aksel-icons';
import { useNavigate, useParams } from 'react-router-dom';
import { getResourcePageURL } from 'resourceadm/utils/urlUtils';
import { ResourceType } from 'resourceadm/types/global';

interface Props {
  resource: ResourceType;
}

export const ResourceTableDataRow = ({ resource }: Props) => {
  const { selectedContext, repo } = useParams();

  const navigate = useNavigate();

  return (
    <tr>
      <td className={`${classes.tableDataLarge} ${classes.tableData}`}>
        <p className={classes.tableDataText}>{resource.name}</p>
      </td>
      <td className={`${classes.tableDataLarge} ${classes.tableData}`}>
        <p className={classes.tableDataText}>{resource.createdBy}</p>
      </td>
      <td className={`${classes.tableDataMedium} ${classes.tableData}`}>
        <p className={classes.tableDataText}>{resource.dateChanged}</p>
      </td>
      <td className={`${classes.tableDataSmall} ${classes.tableData}`}>
        <ResourceTableDataChip hasPolicy={resource.hasPolicy} />
      </td>
      <td className={`${classes.tableDataSmall} ${classes.tableData}`}>
        <Button
          variant='quiet'
          color='secondary'
          icon={<PencilWritingIcon title='Rediger ressurs' />}
          iconPlacement='right'
          onClick={() =>
            navigate(getResourcePageURL(selectedContext, repo, resource.resourceId, 'about'))
          }
        >
          Rediger
        </Button>
      </td>
      <td className={`${classes.tableDataXSmall} ${classes.tableData}`}>
        <Button
          variant='quiet'
          color='secondary'
          icon={<MenuElipsisVerticalIcon title='Se valg for ressursen' />}
          onClick={() => {}}
        />
      </td>
    </tr>
  );
};
