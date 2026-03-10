import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { ContactPointDialog } from './ContactPointDialog';
import { ContactPointTableHeader } from './ContactPointTableHeader';
import { ContactPointTableRow } from './ContactPointTableRow';

const emptyContactPoint: ContactPoint = {
  email: '',
  category: '',
  telephone: '',
  contactPage: '',
};

export type ContactPointsTableProps = {
  contactPointList?: ContactPoint[];
  onContactPointsChanged: (contactPoints: ContactPoint[]) => void;
  id: string;
};

export const ContactPointsTable = ({
  contactPointList,
  onContactPointsChanged,
  id,
}: ContactPointsTableProps): ReactElement => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const contactSectionRef = useRef<HTMLDivElement | null>(null);
  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();

  const items = useMemo(() => contactPointList ?? [], [contactPointList]);
  const focusParam = searchParams.get('focus') ?? '';
  const isFocusTarget = focusParam === `${id}-0`;
  const [showValidationButtonFocus, setShowValidationButtonFocus] = useState(false);

  useLayoutEffect(() => {
    if (!isFocusTarget) return;
    const target = addButtonRef.current ?? contactSectionRef.current;
    if (!target) return;
    if (target === addButtonRef.current) setShowValidationButtonFocus(true);

    const scrollAndFocus = () => {
      contactSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.focus({ preventScroll: true });
    };

    requestAnimationFrame(scrollAndFocus);

    const next = new URLSearchParams(searchParams);
    next.delete('focus');
    setSearchParams(next, { replace: true });
  }, [focusParam, isFocusTarget, items, searchParams, setSearchParams]);

  const [draftContactPoint, setDraftContactPoint] = useState<ContactPoint>(emptyContactPoint);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const openCreateDialog = () => {
    setDraftContactPoint(emptyContactPoint);
    setEditingIndex(null);
    dialogRef.current?.showModal();
  };

  const openEditDialog = (index: number) => {
    setDraftContactPoint(items[index]);
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
        ? [...items, draftContactPoint]
        : items.map((item, index) => (index === editingIndex ? draftContactPoint : item));
    onContactPointsChanged(updatedList);
    closeDialog();
  };

  const handleRemove = (indexToRemove: number): void => {
    const updatedList = items.filter((_, index) => index !== indexToRemove);
    onContactPointsChanged(updatedList);
  };

  return (
    <>
      <div className={classes.contactField}>
        <div
          ref={contactSectionRef}
          id={`${id}-0`}
          tabIndex={-1}
          aria-label={t('app_settings.about_tab_contact_point_dialog_add_title')}
        >
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
            {items.map((contactPoint, index) => (
              <ContactPointTableRow
                key={`${id}-${index}`}
                contactPoint={contactPoint}
                index={index}
                onEdit={openEditDialog}
                onRemove={handleRemove}
              />
            ))}
          </StudioTable.Body>
        </StudioTable>
      </div>
      <div className={classes.addButtonContainer}>
        <StudioButton
          ref={addButtonRef}
          id={`${id}-add-button`}
          className={`${classes.addButton} ${showValidationButtonFocus ? classes.validationFocusedButton : ''}`}
          variant='secondary'
          icon={<PlusIcon />}
          iconPlacement='left'
          onClick={openCreateDialog}
          onBlur={() => setShowValidationButtonFocus(false)}
          aria-label={t('app_settings.about_tab_contact_point_add_button_text')}
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
