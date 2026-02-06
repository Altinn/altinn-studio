import React, { useRef, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import {
  StudioButton,
  StudioTable,
  StudioTag,
  StudioParagraph,
  StudioLabel,
} from '@studio/components';
import type { ContactPoint, ContactPointField } from 'app-shared/types/AppConfig';
import { PlusIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import classes from './ContactPointsTable.module.css';
import { getValidExternalUrl } from 'app-shared/utils/urlUtils';
import { ContactPointDialog } from './ContactPointDialog';
import { ContactPointTableHeader } from './ContactPointTableHeader';
import { ContactPointTableRow } from './ContactPointTableRow';

//TODO: Refactore ContactPointsTable         ✅
//TODO: Add tests for ContactPointDialog  ✅
//TODO: Add tests for ContactPointTableRow   ✅
//TODO: Add tests for ContactPointTableHeader ✅
//TODO: Add tests for ContactPointsTable.  ✅
//TODO: Remove ContactPoints component and related files after ContactPointsTable is in use.  ⌛

const emptyContactPoint: ContactPoint = {
  email: '',
  category: '',
  telephone: '',
  contactPage: '',
};

export type ContactPointsTableProps = {
  contactPointList: ContactPoint[];
  onContactPointsChanged: (contactPoints: ContactPoint[]) => void;
  id: string;
};

export const ContactPointsTable = ({
  contactPointList,
  onContactPointsChanged,
  id,
}: ContactPointsTableProps): ReactElement => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const { t } = useTranslation();

  const [listItems, setListItems] = useState<ContactPoint[]>(contactPointList ?? []);
  const [draftContactPoint, setDraftContactPoint] = useState<ContactPoint>(emptyContactPoint);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const openCreateDialog = () => {
    setDraftContactPoint(emptyContactPoint);
    setEditingIndex(null);
    dialogRef.current?.showModal();
  };

  const openEditDialog = (index: number) => {
    setDraftContactPoint(listItems[index]);
    setEditingIndex(index);
    dialogRef.current?.showModal();
  };

  const closeDialog = () => {
    dialogRef.current?.close();
    setDraftContactPoint(emptyContactPoint);
    setEditingIndex(null);
  };

  const handleFieldChange =
    (field: keyof ContactPoint | ContactPointField) =>
    (event: ChangeEvent<HTMLInputElement>): void => {
      const { value } = event.target;
      setDraftContactPoint((previous) => ({
        ...previous,
        [field]: value,
      }));
    };

  const handleSave = (): void => {
    const updatedList =
      editingIndex === null
        ? [...listItems, draftContactPoint]
        : listItems.map((item, index) => (index === editingIndex ? draftContactPoint : item));
    setListItems(updatedList);
    onContactPointsChanged(updatedList);
    closeDialog();
  };

  const handleRemove = (indexToRemove: number): void => {
    const updatedList = listItems.filter((_, index) => index !== indexToRemove);
    setListItems(updatedList);
    onContactPointsChanged(updatedList);
  };

  const handleLinkClick = (contactPage: string) => {
    const href = getValidExternalUrl(contactPage);
    if (href) window.open(href, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <div className={classes.contactField}>
        <div>
          <StudioLabel>{t('app_settings.about_tab_contact_point_dialog_add_title')}</StudioLabel>
          <StudioParagraph>
            {t('app_settings.about_tab_contact_point_fieldset_description')}
          </StudioParagraph>
        </div>
        <StudioTag data-color='warning'>{t('general.required')}</StudioTag>
      </div>
      <div className={classes.tableWrapper}>
        <StudioTable border={true}>
          <ContactPointTableHeader />
          <StudioTable.Body>
            {listItems.map((contactPoint, index) => (
              <ContactPointTableRow
                key={`${id}-${index}`}
                contactPoint={contactPoint}
                index={index}
                onEdit={openEditDialog}
                onRemove={handleRemove}
                onLinkClick={handleLinkClick}
              />
            ))}
          </StudioTable.Body>
        </StudioTable>
      </div>
      <div className={classes.addButtonContainer}>
        <StudioButton
          className={classes.addButton}
          variant='secondary'
          icon={<PlusIcon />}
          iconPlacement='left'
          onClick={openCreateDialog}
        >
          {t('app_settings.about_tab_contact_point_add_button_text')}
        </StudioButton>
      </div>
      <ContactPointDialog
        dialogRef={dialogRef}
        draftContactPoint={draftContactPoint}
        onFieldChange={handleFieldChange}
        onSave={handleSave}
        onClose={closeDialog}
      />
    </>
  );
};
