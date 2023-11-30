import React, { useState } from 'react';
import { Button, Paragraph, Select, SingleSelectOption } from '@digdir/design-system-react';
import {
  MagnifyingGlassIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from '@navikt/aksel-icons';
import classes from './TextResource.module.css';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentEditId } from '../features/appData/textResources/textResourcesSlice';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import {
  allTextResourceIdsWithTextSelector,
  getCurrentEditId,
  textResourceByLanguageAndIdSelector,
} from '../selectors/textResourceSelectors';
import { generateRandomId } from 'app-shared/utils/generateRandomId';
import { generateTextResourceId } from '../utils/generateId';
import { useText } from '../hooks';
import { prepend } from 'app-shared/utils/arrayUtils';
import cn from 'classnames';
import type { ITextResource } from 'app-shared/types/global';
import { useTextResourcesSelector } from '../hooks';
import { FormField } from './FormField';
import { AltinnConfirmDialog } from 'app-shared/components/AltinnConfirmDialog';
import { useTranslation } from 'react-i18next';
import { shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';

export interface TextResourceProps {
  description?: string;
  handleIdChange: (id: string) => void;
  handleRemoveTextResource?: () => void;
  label?: string;
  placeholder?: string;
  previewMode?: boolean;
  textResourceId?: string;
  generateIdOptions?: GenerateTextResourceIdOptions;
}

export interface GenerateTextResourceIdOptions {
  componentId: string;
  layoutId: string;
  textResourceKey: string;
}

export const generateId = (options?: GenerateTextResourceIdOptions) => {
  if (!options) {
    return generateRandomId(12);
  }
  return generateTextResourceId(options.layoutId, options.componentId, options.textResourceKey);
};

export const TextResource = ({
  description,
  handleIdChange,
  handleRemoveTextResource,
  label,
  placeholder,
  previewMode,
  textResourceId,
  generateIdOptions,
}: TextResourceProps) => {
  const dispatch = useDispatch();

  const textResource: ITextResource = useTextResourcesSelector<ITextResource>(
    textResourceByLanguageAndIdSelector(DEFAULT_LANGUAGE, textResourceId),
  );
  const textResources: ITextResource[] = useTextResourcesSelector<ITextResource[]>(
    allTextResourceIdsWithTextSelector(DEFAULT_LANGUAGE),
  );
  const { t } = useTranslation();
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState<boolean>(false);

  const editId = useSelector(getCurrentEditId);
  const setEditId = (id: string) => dispatch(setCurrentEditId(id));
  const isEditing = textResourceId && editId === textResourceId;

  const handleEditButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (textResourceId) {
      setEditId(textResourceId);
    } else {
      const id = generateId(generateIdOptions);
      handleIdChange(id);
      setEditId(id);
    }
  };

  const handleDeleteButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    handleRemoveTextResource();
  };

  const searchOptions: SingleSelectOption[] = prepend<SingleSelectOption>(
    textResources.map((tr) => ({
      label: tr.id,
      value: tr.id,
      formattedLabel: <TextResourceOption textResource={tr} />,
      keywords: [tr.id, tr.value],
    })),
    { label: t('ux_editor.search_text_resources_none'), value: '' },
  );

  const renderTextResource = () => (
    <span
      className={cn(
        classes.root,
        previewMode && classes.previewMode,
        isEditing && classes.isEditing,
        isSearchMode && classes.isSearching,
      )}
    >
      {label && <span className={classes.label}>{label}</span>}
      {description && <span className={classes.description}>{description}</span>}
      {isSearchMode && (
        <span className={classes.searchContainer}>
          <span className={classes.select}>
            <Select
              hideLabel={true}
              label={t('ux_editor.search_text_resources_label')}
              onChange={(id) => handleIdChange(id === '' ? undefined : id)}
              options={searchOptions}
              value={textResource?.id ?? ''}
            />
          </span>
          <Button
            aria-label={t('ux_editor.search_text_resources_close')}
            className={classes.button}
            color='second'
            icon={<XMarkIcon />}
            onClick={() => setIsSearchMode(false)}
            title={t('ux_editor.search_text_resources_close')}
            variant='tertiary'
            size='small'
          />
        </span>
      )}
      <span className={classes.textResource}>
        {textResource?.value ? (
          <Paragraph className={classes.paragraph}>{textResource.value}</Paragraph>
        ) : (
          <span className={classes.placeholder}>{placeholder}</span>
        )}
        <span className={classes.buttonsWrapper}>
          <span className={classes.buttons}>
            {textResource?.value ? (
              <Button
                aria-label={t('general.edit')}
                className={classes.button}
                color='second'
                disabled={isEditing}
                icon={<PencilIcon />}
                onClick={handleEditButtonClick}
                title={t('general.edit')}
                variant='tertiary'
                size='small'
              />
            ) : (
              <Button
                aria-label={t('general.add')}
                className={classes.button}
                color='second'
                disabled={isEditing}
                icon={<PlusIcon />}
                onClick={handleEditButtonClick}
                title={t('general.add')}
                variant='tertiary'
                size='small'
              />
            )}
            <Button
              aria-label={t('general.search')}
              className={classes.button}
              color='second'
              disabled={isSearchMode}
              icon={<MagnifyingGlassIcon />}
              onClick={() => setIsSearchMode(true)}
              title={t('general.search')}
              variant='tertiary'
              size='small'
            />
            <AltinnConfirmDialog
              open={isConfirmDeleteDialogOpen}
              confirmText={t('ux_editor.text_resource_bindings.delete_confirm')}
              onConfirm={handleDeleteButtonClick}
              onClose={() => setIsConfirmDeleteDialogOpen(false)}
              trigger={
                <Button
                  aria-label={t('general.delete')}
                  className={classes.button}
                  color='second'
                  disabled={
                    !handleRemoveTextResource ||
                    !(!!textResourceId || shouldDisplayFeature('componentConfigBeta'))
                  }
                  icon={<TrashIcon />}
                  onClick={() => setIsConfirmDeleteDialogOpen(true)}
                  title={t('general.delete')}
                  variant='tertiary'
                  size='small'
                />
              }
            >
              <div>
                <p>{t('ux_editor.text_resource_bindings.delete_confirm_question')}</p>
                <p>{t('ux_editor.text_resource_bindings.delete_info')}</p>
              </div>
            </AltinnConfirmDialog>
          </span>
        </span>
      </span>
    </span>
  );

  return previewMode ? (
    renderTextResource()
  ) : (
    <FormField
      id={textResourceId}
      value={{ [textResourceId]: textResource?.value }}
      propertyPath='definitions/component/properties/textResourceBindings'
      renderField={() => renderTextResource()}
    />
  );
};

export interface TextResourceOptionProps {
  textResource: ITextResource;
}

export const TextResourceOption = ({ textResource }: TextResourceOptionProps) => {
  const t = useText();
  return (
    <span className={classes.textOption}>
      <span className={classes.textOptionId}>{textResource.id}</span>
      <span className={cn(classes.textOptionValue, !textResource.value && classes.empty)}>
        {textResource.value || t('ux_editor.no_text')}
      </span>
    </span>
  );
};
