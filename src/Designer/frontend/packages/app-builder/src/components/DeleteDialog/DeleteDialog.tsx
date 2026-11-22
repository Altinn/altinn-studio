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
import { ComponentType } from 'app-shared/types/ComponentType';
import type { LayoutComponent, TextsById } from '../../types';
import { useAppBuilder } from '../../contexts/AppBuilderContext';
import { useAllLayoutsQuery } from '../../hooks/useAllLayoutsQuery';
import { getTextKey } from '../../utils/componentUtils';
import { findRuleReferences, getDeletionCandidates } from '../../utils/deletionUtils';
import type {
  ComponentReference,
  DeletionCandidates,
  RemovableItem,
  RuleReference,
} from '../../utils/deletionUtils';
import { getPageTitle } from '../../utils/pageUtils';
import classes from './DeleteDialog.module.css';

export type DeleteSelection = {
  textKeys: string[];
  fieldNames: string[];
};

export type DeleteDialogProps = {
  title: string;
  /** What is deleted, such as "The component is deleted from the page." */
  description: string;
  /** The components that are deleted together, such as a group and its children, or a page's. */
  components: LayoutComponent[];
  /** Text keys that go with them besides the components' own, such as the name of a deleted page. */
  extraTextKeys?: string[];
  /** The page the components are on. */
  pageName: string;
  /** The page that is deleted, if it is, so its own rules are not listed as left behind. */
  deletedPageName?: string;
  isDeleting: boolean;
  onDelete: (selection: DeleteSelection) => void;
  onClose: () => void;
};

/**
 * Asks before components are deleted, and offers to remove their texts and data model fields with
 * them. Whatever only they use is selected; whatever other components use cannot be removed. It also
 * says what goes with them anyway, and which rules elsewhere check them. It is rendered in the Studio
 * page rather than in the canvas, so it covers the whole page.
 */
export function DeleteDialog(props: DeleteDialogProps): ReactElement {
  const { t } = useTranslation();
  const { org, app, layoutSetName, layoutSetNames, texts, dataModel } = useAppBuilder();
  const { title, components, extraTextKeys, pageName, deletedPageName, onClose } = props;
  const {
    allLayouts,
    isPending: layoutsPending,
    isError: layoutsError,
  } = useAllLayoutsQuery(org, app, layoutSetNames);

  const candidates = allLayouts
    ? getDeletionCandidates({
        components,
        extraTextKeys,
        layoutSetName,
        pageName,
        deletedPageName,
        allLayouts,
        existingTextKeys: Object.keys(texts),
        dataModel,
      })
    : undefined;
  const ruleReferences = allLayouts
    ? findRuleReferences(
        allLayouts[layoutSetName] ?? {},
        new Set(components.map(({ id }) => id)),
        props.deletedPageName,
      )
    : [];

  return createPortal(
    <StudioDialog open onClose={onClose} closedby='any' data-color-scheme='light'>
      <StudioDialog.Block>
        <StudioHeading className={classes.heading}>
          <TrashIcon />
          {title}
        </StudioHeading>
      </StudioDialog.Block>
      <StudioDialog.Block>
        {layoutsError && <LayoutsLoadError onClose={onClose} />}
        {candidates && (
          <DeleteChoices
            {...props}
            texts={texts}
            layoutSetName={layoutSetName}
            candidates={candidates}
            ruleReferences={ruleReferences}
          />
        )}
        {layoutsPending && <StudioSpinner aria-label={t('general.loading')} />}
      </StudioDialog.Block>
    </StudioDialog>,
    document.body,
  );
}

type DeleteChoicesProps = DeleteDialogProps & {
  texts: TextsById;
  layoutSetName: string;
  candidates: DeletionCandidates;
  ruleReferences: RuleReference[];
};

function DeleteChoices({
  description,
  deletedPageName,
  components,
  layoutSetName,
  texts,
  candidates,
  ruleReferences,
  isDeleting,
  onDelete,
  onClose,
}: DeleteChoicesProps): ReactElement {
  const { t } = useTranslation();
  // Only the texts the builder made for what is deleted, and nothing else uses, are removed.
  const removableTexts = candidates.texts.filter(({ isSelectedByDefault }) => isSelectedByDefault);
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
      <StudioParagraph>{description}</StudioParagraph>
      {components.some(({ type }) => type === ComponentType.FileUpload) && (
        <StudioParagraph data-size='sm'>{t('app_builder.delete.attachments')}</StudioParagraph>
      )}
      {ruleReferences.length > 0 && (
        <StudioParagraph data-size='sm'>
          {t('app_builder.delete.rules', {
            references: ruleReferences
              .map(({ pageName, component }) =>
                component
                  ? t('app_builder.delete.reference', {
                      componentName: getComponentName(component, texts),
                      pageName: getPageTitle(pageName, texts),
                    })
                  : t('app_builder.delete.page_reference', {
                      pageName: getPageTitle(pageName, texts),
                    }),
              )
              .join(', '),
          })}
        </StudioParagraph>
      )}
      {hasChoices && (
        <fieldset className={classes.choices}>
          <legend className={classes.legend}>{t('app_builder.delete.also_remove')}</legend>
          {removableTexts.length > 0 && (
            <StudioCheckbox
              label={t(
                deletedPageName ? 'app_builder.delete.page_texts' : 'app_builder.delete.texts',
                {
                  count: removableTexts.length,
                },
              )}
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
            {candidates.texts.map(({ name, usedBy, isSelectedByDefault }) => (
              <li key={name}>
                {usedBy.length > 0
                  ? t('app_builder.delete.text_kept', {
                      textKey: name,
                      references: describeReferences(usedBy),
                    })
                  : isSelectedByDefault
                    ? t('app_builder.delete.text_removable', { textKey: name })
                    : t('app_builder.delete.text_kept_unknown_use', { textKey: name })}
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

// Without every layout set's pages it is unknown what uses the texts and fields, so nothing is deleted.
function LayoutsLoadError({ onClose }: { onClose: () => void }): ReactElement {
  const { t } = useTranslation();
  return (
    <div className={classes.content}>
      <StudioParagraph>{t('app_builder.delete.load_error')}</StudioParagraph>
      <div className={classes.buttons}>
        <StudioButton variant='secondary' onClick={onClose}>
          {t('general.close')}
        </StudioButton>
      </div>
    </div>
  );
}

function describeField(
  field: RemovableItem,
  describeReferences: (references: ComponentReference[]) => string,
  t: (key: string, values?: Record<string, string>) => string,
): string {
  if (field.usedBy.length > 0) {
    return t('app_builder.delete.field_used_by', { references: describeReferences(field.usedBy) });
  }
  return t('app_builder.delete.field_may_have_answers');
}

function getComponentName(component: LayoutComponent, texts: TextsById): string {
  const titleKey = getTextKey(component, 'title');
  return (titleKey && texts[titleKey]) || component.id;
}
