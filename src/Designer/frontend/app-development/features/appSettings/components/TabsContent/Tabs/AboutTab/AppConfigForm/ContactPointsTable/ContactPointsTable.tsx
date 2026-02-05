import React, { useRef, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import {
  StudioButton,
  StudioTable,
  StudioDialog,
  StudioFieldset,
  StudioTag,
  StudioTextfield,
  StudioDeleteButton,
  StudioFormActions,
  StudioParagraph,
  StudioLabel,
} from '@studio/components';
import { type ContactPoint, ContactPointField } from 'app-shared/types/AppConfig';
import { LinkIcon, PencilIcon, PlusIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import classes from './ContactPointsTable.module.css';
import { getValidExternalUrl } from 'app-shared/utils/urlUtils';

//TODO: Refactore ContactPointsTable
//TODO: Remove ContactPoints component and related files after ContactPointsTable is in use
//TODO: Add tests for ContactPointsTable

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
          <StudioTable.Head>
            <StudioTable.Row className={classes.headerNoWrap}>
              <StudioTable.Cell>
                {t('app_settings.about_tab_contact_point_fieldset_email_label')}
              </StudioTable.Cell>
              <StudioTable.Cell>
                {t('app_settings.about_tab_contact_point_fieldset_telephone_label')}
              </StudioTable.Cell>
              <StudioTable.Cell>
                {t('app_settings.about_tab_contact_point_fieldset_title_desc_label')}
              </StudioTable.Cell>
              <StudioTable.Cell>
                {t('app_settings.about_tab_contact_point_fieldset_link_label')}
              </StudioTable.Cell>
              <StudioTable.Cell aria-label={t('general.edit')} />
              <StudioTable.Cell aria-label={t('general.delete')} />
            </StudioTable.Row>
          </StudioTable.Head>
          <StudioTable.Body>
            {listItems.map((contactPoint, index) => (
              <StudioTable.Row key={`${id}-${index}`}>
                <StudioTable.Cell>
                  {contactPoint.email && (
                    <span className={classes.emailText}>{contactPoint.email}</span>
                  )}
                </StudioTable.Cell>
                <StudioTable.Cell>{contactPoint.telephone}</StudioTable.Cell>
                <StudioTable.Cell>{contactPoint.category}</StudioTable.Cell>
                <StudioTable.Cell>
                  {getValidExternalUrl(contactPoint.contactPage) && (
                    <StudioButton
                      variant='tertiary'
                      icon={<LinkIcon />}
                      aria-label={t('app_settings.about_tab_contact_point_table_link_open')}
                      onClick={() => handleLinkClick(contactPoint.contactPage)}
                    />
                  )}
                </StudioTable.Cell>
                <StudioTable.Cell>
                  <StudioButton variant='tertiary' onClick={() => openEditDialog(index)}>
                    {<PencilIcon />}
                  </StudioButton>
                </StudioTable.Cell>
                <StudioTable.Cell>
                  <StudioDeleteButton
                    variant='tertiary'
                    onDelete={() => handleRemove(index)}
                    confirmMessage={t('app_settings.about_tab_contact_point_delete_confirm')}
                  ></StudioDeleteButton>
                </StudioTable.Cell>
              </StudioTable.Row>
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
      <StudioDialog ref={dialogRef} onClose={closeDialog}>
        <StudioDialog.Block>
          <StudioFieldset
            className={classes.fieldset}
            legend={t('app_settings.about_tab_contact_point_dialog_add_title')}
            description={t('app_settings.about_tab_contact_point_fieldset_description')}
          >
            <StudioTextfield
              label={t('app_settings.about_tab_contact_point_fieldset_email_label')}
              value={draftContactPoint.email}
              onChange={handleFieldChange(ContactPointField.Email)}
            />
            <StudioTextfield
              label={t('app_settings.about_tab_contact_point_fieldset_telephone_label')}
              value={draftContactPoint.telephone}
              onChange={handleFieldChange(ContactPointField.Telephone)}
            />
            <StudioTextfield
              label={t('app_settings.about_tab_contact_point_fieldset_contact_page_label')}
              value={draftContactPoint.contactPage}
              onChange={handleFieldChange(ContactPointField.ContactPage)}
            />
            <StudioTextfield
              className={classes.descriptionColumn}
              label={t('app_settings.about_tab_contact_point_fieldset_category_label')}
              description={t('app_settings.about_tab_contact_point_fieldset_category_description')}
              value={draftContactPoint.category}
              onChange={handleFieldChange(ContactPointField.Category)}
            />
            <StudioFormActions
              className={classes.formActions}
              isLoading={false}
              primary={{
                label: t('general.save'),
                onClick: handleSave,
              }}
              secondary={{
                label: t('general.cancel'),
                onClick: closeDialog,
              }}
            />
          </StudioFieldset>
        </StudioDialog.Block>
      </StudioDialog>
    </>
  );
};
