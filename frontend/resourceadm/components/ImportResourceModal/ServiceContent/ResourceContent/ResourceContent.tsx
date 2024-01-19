import React, { ReactNode, useState } from 'react';
import classes from './ResourceContent.module.css';
import { Altinn2LinkService } from 'app-shared/types/Altinn2LinkService';
import { useTranslation } from 'react-i18next';
import { ResourceNameAndId } from '../../../../components/ResourceNameAndId';
import { Paragraph } from '@digdir/design-system-react';

export type ResourceContentProps = {
  altinn2LinkService: Altinn2LinkService;
  resourceIdExists: boolean;
};

/**
 * @component
 *    Displays the Resource content in the import resource from Altinn 2 modal
 *
 * @property {Altinn2LinkService}[altinn2LinkService] - The service to import from
 * @property {boolean}[resourceIdExists] - If the id already exists
 *
 * @returns {ReactNode} - The rendered component
 */
export const ResourceContent = ({
  altinn2LinkService,
  resourceIdExists,
}: ResourceContentProps): ReactNode => {
  const { t } = useTranslation();

  const [id, setId] = useState(altinn2LinkService.serviceName);
  const [title, setTitle] = useState(altinn2LinkService.serviceName);

  return (
    <div>
      <div className={classes.contentDivider} />
      <Paragraph size='small'>
        {t('resourceadm.dashboard_import_modal_resource_name_and_id_text')}
      </Paragraph>
      <ResourceNameAndId
        idLabel={t('resourceadm.dashboard_resource_name_and_id_resource_id')}
        titleLabel={t('resourceadm.dashboard_resource_name_and_id_resource_name')}
        id={id}
        title={title}
        onIdChange={(newId: string) => setId(newId)}
        onTitleChange={(newTitle: string) => setTitle(newTitle)}
        conflictErrorMessage={
          resourceIdExists ? t('resourceadm.dashboard_resource_name_and_id_error') : ''
        }
      />
    </div>
  );
};
