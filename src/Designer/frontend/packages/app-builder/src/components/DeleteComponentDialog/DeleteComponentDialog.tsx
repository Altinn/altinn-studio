import { useState } from 'react';
import type { ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  StudioButton,
  StudioCheckbox,
  StudioDialog,
  StudioHeading,
  StudioParagraph,
  StudioSpinner,
} from '@designer/components';
import { TrashIcon } from '@designer/icons';
import type { LayoutComponent, TextsById } from '../../types';
import type { DataModel } from '../../hooks/useDataModelQuery';
import { useAllLayoutsQuery } from '../../hooks/useAllLayoutsQuery';
import { useIsPublishedQuery } from '../../hooks/useIsPublishedQuery';
import { getTextKey } from '../../utils/componentUtils';
import { getDeletionCandidates } from '../../utils/deletionUtils';
import type {
  ComponentReference,
  DeletionCandidates,
  RemovableItem,
} from '../../utils/deletionUtils';
import classes from './DeleteComponentDialog.module.css';

export type DeleteSelection = {
  textKeys: string[];
  fieldNames: string[];
};

export type DeleteComponentDialogProps = {
  org: string;
  app: string;
  layoutSetName: string;
  layoutSetNames: string[];
  component: LayoutComponent;
  texts: TextsById;
  dataModel?: DataModel;
  isDeleting: boolean;
  onDelete: (selection: DeleteSelection) => void;
  onClose: () => void;
};

/**
 * Asks before a component is deleted, and offers to remove its texts and data model field with it.
 * Whatever only this component uses is selected; whatever other components use cannot be removed.
 * It is rendered in the Studio page rather than in the canvas, so it covers the whole page.
 */
export function DeleteComponentDialog(props: DeleteComponentDialogProps): ReactElement {
  const { t } = useTranslation();
  const { org, app, layoutSetName, layoutSetNames, component, texts, dataModel, onClose } = props;
  const { allLayouts, isPending: layoutsPending } = useAllLayoutsQuery(org, app, layoutSetNames);
  const { isPublished, isPending: publishedPending } = useIsPublishedQuery(org, app);
  const componentName = getComponentName(component, texts);

  const candidates =
    !layoutsPending && !publishedPending
      ? getDeletionCandidates({
          component,
          layoutSetName,
          allLayouts,
          existingTextKeys: Object.keys(texts),
          dataModel,
          isPublished,
        })
      : undefined;

  return createPortal(
    <StudioDialog open onClose={onClose} closedby='any' data-color-scheme='light'>
      <StudioDialog.Block>
        <StudioHeading className={classes.heading}>
          <TrashIcon />
          {t('app_builder.delete.title', { componentName })}
        </StudioHeading>
      </StudioDialog.Block>
      <StudioDialog.Block>
        {candidates ? (
          <DeleteChoices {...props} candidates={candidates} />
        ) : (
          <StudioSpinner aria-label={t('general.loading')} />
        )}
      </StudioDialog.Block>
    </StudioDialog>,
    document.body,
  );
}

type DeleteChoicesProps = DeleteComponentDialogProps & {
  candidates: DeletionCandidates;
};

function DeleteChoices({
  layoutSetName,
  texts,
  candidates,
  isDeleting,
  onDelete,
  onClose,
}: DeleteChoicesProps): ReactElement {
  const { t } = useTranslation();
  const removableTexts = candidates.texts.filter(({ usedBy }) => usedBy.length === 0);
  const [shouldRemoveTexts, setShouldRemoveTexts] = useState<boolean>(removableTexts.length > 0);
  const [selectedFields, setSelectedFields] = useState<string[]>(
    candidates.fields
      .filter(({ isSelectedByDefault }) => isSelectedByDefault)
      .map(({ name }) => name),
  );

  const describeReferences = (references: ComponentReference[]): string =>
    references
      .map(({ component, pageName, layoutSetName: referenceLayoutSet }) =>
        t('app_builder.delete.reference', {
          componentName: getComponentName(component, texts),
          pageName:
            referenceLayoutSet === layoutSetName ? pageName : `${pageName} (${referenceLayoutSet})`,
        }),
      )
      .join(', ');

  const toggleField = (fieldName: string, isSelected: boolean): void =>
    setSelectedFields((current) =>
      isSelected ? [...current, fieldName] : current.filter((name) => name !== fieldName),
    );

  const handleDelete = (): void =>
    onDelete({
      textKeys: shouldRemoveTexts ? removableTexts.map(({ name }) => name) : [],
      fieldNames: selectedFields,
    });

  const hasChoices = removableTexts.length > 0 || candidates.fields.length > 0;

  return (
    <div className={classes.content}>
      <StudioParagraph>{t('app_builder.delete.description')}</StudioParagraph>
      {hasChoices && (
        <fieldset className={classes.choices}>
          <legend className={classes.legend}>{t('app_builder.delete.also_remove')}</legend>
          {removableTexts.length > 0 && (
            <StudioCheckbox
              label={t('app_builder.delete.texts', { count: removableTexts.length })}
              description={t('app_builder.delete.texts_description')}
              checked={shouldRemoveTexts}
              onChange={(event) => setShouldRemoveTexts(event.target.checked)}
            />
          )}
          {candidates.fields.map((field) => (
            <StudioCheckbox
              key={field.name}
              label={t('app_builder.delete.field', { fieldName: field.name })}
              description={describeField(field, describeReferences, t)}
              checked={selectedFields.includes(field.name)}
              disabled={field.usedBy.length > 0}
              onChange={(event) => toggleField(field.name, event.target.checked)}
            />
          ))}
        </fieldset>
      )}
      {candidates.texts.length > 0 && (
        <details className={classes.details}>
          <summary>{t('app_builder.delete.details')}</summary>
          <ul>
            {candidates.texts.map(({ name, usedBy }) => (
              <li key={name}>
                {usedBy.length > 0
                  ? t('app_builder.delete.text_kept', {
                      textKey: name,
                      references: describeReferences(usedBy),
                    })
                  : t('app_builder.delete.text_removable', { textKey: name })}
              </li>
            ))}
          </ul>
        </details>
      )}
      <div className={classes.buttons}>
        <StudioButton
          variant='primary'
          data-color='danger'
          icon={<TrashIcon />}
          disabled={isDeleting}
          onClick={handleDelete}
        >
          {t('general.delete')}
        </StudioButton>
        <StudioButton variant='secondary' onClick={onClose}>
          {t('general.cancel')}
        </StudioButton>
      </div>
    </div>
  );
}

function describeField(
  field: RemovableItem,
  describeReferences: (references: ComponentReference[]) => string,
  t: (key: string, values?: Record<string, string>) => string,
): string | undefined {
  if (field.usedBy.length > 0) {
    return t('app_builder.delete.field_used_by', { references: describeReferences(field.usedBy) });
  }
  return field.mayHaveStoredAnswers ? t('app_builder.delete.field_may_have_answers') : undefined;
}

function getComponentName(component: LayoutComponent, texts: TextsById): string {
  const titleKey = getTextKey(component, 'title');
  return (titleKey && texts[titleKey]) || component.id;
}
