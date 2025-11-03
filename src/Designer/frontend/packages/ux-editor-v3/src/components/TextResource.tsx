import React, { useState } from 'react';
import { Paragraph } from '@digdir/designsystemet-react';
import { MagnifyingGlassIcon, PencilIcon, PlusIcon, TrashIcon, XMarkIcon } from '@studio/icons';
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
import { useText, useTextResourcesSelector } from '../hooks';
import cn from 'classnames';
import type { ITextResource } from 'app-shared/types/global';

import { FormField } from './FormField';
import { AltinnConfirmDialog } from 'app-shared/components/AltinnConfirmDialog';
import { useTranslation } from 'react-i18next';
import { shouldDisplayFeature, FeatureFlag } from 'app-shared/utils/featureToggleUtils';
import { StudioButton, StudioSelect } from '@studio/components';

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
            <StudioSelect
              id='text-resource-search-select'
              label={t('ux_editor.search_text_resources_label')}
              onChange={(event) =>
                handleIdChange(event.target.value === '' ? undefined : event.target.value)
              }
              value={textResource?.id ?? ''}
            >
              <option value=''>{t('ux_editor.search_text_resources_none')}</option>
              {textResources.map((option) => (
                <option key={option.id} value={option.id}>
                  <TextResourceOption textResource={option} />
                </option>
              ))}
            </StudioSelect>
          </span>
          <StudioButton
            aria-label={t('ux_editor.search_text_resources_close')}
            className={classes.button}
            color='second'
            icon={<XMarkIcon />}
            onClick={() => setIsSearchMode(false)}
            title={t('ux_editor.search_text_resources_close')}
            variant='tertiary'
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
              <StudioButton
                aria-label={t(getTextKeyForButton('edit', generateIdOptions?.textResourceKey))}
                className={classes.button}
                color='second'
                disabled={isEditing}
                icon={<PencilIcon />}
                onClick={handleEditButtonClick}
                title={t(getTextKeyForButton('edit', generateIdOptions?.textResourceKey))}
                variant='tertiary'
              />
            ) : (
              <StudioButton
                aria-label={t(getTextKeyForButton('add', generateIdOptions?.textResourceKey))}
                className={classes.button}
                color='second'
                disabled={isEditing}
                icon={<PlusIcon />}
                onClick={handleEditButtonClick}
                title={t(getTextKeyForButton('add', generateIdOptions?.textResourceKey))}
                variant='tertiary'
              />
            )}
            <StudioButton
              aria-label={t(getTextKeyForButton('search', generateIdOptions?.textResourceKey))}
              className={classes.button}
              color='second'
              disabled={isSearchMode}
              icon={<MagnifyingGlassIcon />}
              onClick={() => setIsSearchMode(true)}
              title={t(getTextKeyForButton('search', generateIdOptions?.textResourceKey))}
              variant='tertiary'
            />
            <AltinnConfirmDialog
              open={isConfirmDeleteDialogOpen}
              confirmText={t('ux_editor.text_resource_bindings.delete_confirm')}
              onConfirm={handleDeleteButtonClick}
              onClose={() => setIsConfirmDeleteDialogOpen(false)}
              triggerProps={{
                'aria-label': t(getTextKeyForButton('delete', generateIdOptions?.textResourceKey)),
                className: classes.button,
                color: 'second',
                disabled:
                  !handleRemoveTextResource ||
                  !(!!textResourceId || shouldDisplayFeature(FeatureFlag.ComponentConfigBeta)),
                icon: <TrashIcon />,
                onClick: () => setIsConfirmDeleteDialogOpen(true),
                title: t(getTextKeyForButton('delete', generateIdOptions?.textResourceKey)),
                variant: 'tertiary',
              }}
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
  return `${textResource.id}: ${textResource.value || t('ux_editor.no_text')}`;
};

type Action = 'add' | 'edit' | 'delete' | 'search';
const textResourceKeys: string[] = ['title', 'description', 'help'];

const getTextKeyForButton = (action: Action, textResourceKey: string): string => {
  return textResourceKey && textResourceKeys.includes(textResourceKey)
    ? `ux_editor.text_resource_binding_${action}_${textResourceKey}`
    : `general.${action}`;
};
