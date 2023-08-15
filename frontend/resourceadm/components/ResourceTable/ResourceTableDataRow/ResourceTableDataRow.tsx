import React from 'react';
import cn from 'classnames';
import classes from './ResourceTableDataRow.module.css';
import { Button, Tag, Paragraph } from '@digdir/design-system-react';
import { PencilWritingIcon } from '@navikt/aksel-icons';
import { useNavigate, useParams } from 'react-router-dom';
import { getResourcePageURL } from 'resourceadm/utils/urlUtils';
import { ResourceType } from 'resourceadm/types/global';

interface Props {
  /**
   * The resource to display in the row
   */
  resource: ResourceType;
}

/**
 * @component
 *    Display the row in the resource table. It displays values for
 *    name, created by, the date changed, if it has policy or not, as well as
 *    two buttons, one for editing a resource, and one for doing more actions
 *
 * @property {ResourceType}[resource] - The resource to display in the row
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const ResourceTableDataRow = ({ resource }: Props): React.ReactNode => {
  const { selectedContext } = useParams();
  const repo = `${selectedContext}-resources`;

  const navigate = useNavigate();

  // TODO - translate
  return (
    <tr style={{ width: '100%' }}>
      <td className={cn(classes.tableDataXLarge, classes.tableData)}>
        {/* TODO - Fix translation of title */}
        <Paragraph size='small'>
          {resource.title['nb'] === '' ? 'Mangler tittel på Bokmål' : resource.title['nb']}
        </Paragraph>
      </td>
      <td className={cn(classes.tableDataLarge, classes.tableData)}>
        <Paragraph size='small'>{resource.createdBy}</Paragraph>
      </td>
      <td className={cn(classes.tableDataMedium, classes.tableData, classes.tableDataDate)}>
        <Paragraph size='small'>{resource.lastChanged}</Paragraph>
      </td>
      <td className={cn(classes.tableDataMedium, classes.tableData)}>
        <Tag color={resource.hasPolicy ? 'info' : 'danger'} variant='outlined' size='small'>
          {resource.hasPolicy ? 'Har tilgangsregler' : 'Mangler tilgangsregler'}
        </Tag>
      </td>
      <td className={cn(classes.tableDataSmall, classes.tableData)}>
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
