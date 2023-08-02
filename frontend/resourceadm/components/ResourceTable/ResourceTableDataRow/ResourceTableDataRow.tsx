import React from 'react';
import classes from './ResourceTableDataRow.module.css';
import { ResourceTableDataChip } from './ResourceTableDataChip';
import { Button } from '@digdir/design-system-react';
import { PencilWritingIcon } from '@navikt/aksel-icons';
import { useNavigate, useParams } from 'react-router-dom';
import { getResourcePageURL } from 'resourceadm/utils/urlUtils';
import { ResourceType } from 'resourceadm/types/global';

interface Props {
  resource: ResourceType;
}

/**
 * Display the row in the resource table. It displays values for
 * name, created by, the date changed, if it has policy or not, as well as
 * two buttons, one for editing a resource, and one for doing more actions
 *
 * @param props.resource the resource to display in the row
 */
export const ResourceTableDataRow = ({ resource }: Props) => {
  const { selectedContext } = useParams();
  const repo = `${selectedContext}-resources`;

  const navigate = useNavigate();

  // TODO - translate
  return (
    <tr>
      <td className={`${classes.tableDataXLarge} ${classes.tableData}`}>
        {/* TODO - Fix translation of title */}
        <p className={classes.tableDataText}>{resource.title['nb']}</p>
      </td>
      <td className={`${classes.tableDataLarge} ${classes.tableData}`}>
        <p className={classes.tableDataText}>{resource.createdBy}</p>
      </td>
      <td className={`${classes.tableDataMedium} ${classes.tableData} ${classes.tableDataDate}`}>
        <p className={classes.tableDataText}>{resource.lastChanged}</p>
      </td>
      <td className={`${classes.tableDataMedium} ${classes.tableData}`}>
        <ResourceTableDataChip hasPolicy={resource.hasPolicy} />
      </td>
      <td className={`${classes.tableDataSmall} ${classes.tableData}`}>
        <Button
          variant='quiet'
          color='secondary'
          icon={<PencilWritingIcon title='Rediger ressurs' />}
          iconPlacement='right'
          onClick={() =>
            navigate(getResourcePageURL(selectedContext, repo, resource.identifier, 'about'))
          }
        >
          Rediger
        </Button>
      </td>
    </tr>
  );
};
