import React, { type ReactElement } from 'react';
import { StudioButton, StudioTable, StudioDeleteButton } from '@studio/components';
import type { ContactPoint } from 'app-shared/types/AppConfig';
import { LinkIcon, PencilIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import classes from './ContactPointTableRow.module.css';
import { getValidExternalUrl } from 'app-shared/utils/urlUtils';

export type ContactPointTableRowProps = {
  contactPoint: ContactPoint;
  index: number;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
  onLinkClick: (contactPage: string) => void;
};

export const ContactPointTableRow = ({
  contactPoint,
  index,
  onEdit,
  onRemove,
  onLinkClick,
}: ContactPointTableRowProps): ReactElement => {
  const { t } = useTranslation();
  const hasValidLink = Boolean(getValidExternalUrl(contactPoint.contactPage));

  return (
    <StudioTable.Row>
      <StudioTable.Cell>
        {contactPoint.email && <span className={classes.emailText}>{contactPoint.email}</span>}
      </StudioTable.Cell>
      <StudioTable.Cell>{contactPoint.telephone}</StudioTable.Cell>
      <StudioTable.Cell>{contactPoint.category}</StudioTable.Cell>
      <StudioTable.Cell>
        {hasValidLink && (
          <StudioButton
            variant='tertiary'
            icon={<LinkIcon />}
            aria-label={t('app_settings.about_tab_contact_point_table_link_open')}
            onClick={() => onLinkClick(contactPoint.contactPage)}
          />
        )}
      </StudioTable.Cell>
      <StudioTable.Cell>
        <StudioButton variant='tertiary' onClick={() => onEdit(index)}>
          <PencilIcon />
        </StudioButton>
      </StudioTable.Cell>
      <StudioTable.Cell>
        <StudioDeleteButton
          variant='tertiary'
          onDelete={() => onRemove(index)}
          confirmMessage={t('app_settings.about_tab_contact_point_delete_confirm')}
        />
      </StudioTable.Cell>
    </StudioTable.Row>
  );
};
