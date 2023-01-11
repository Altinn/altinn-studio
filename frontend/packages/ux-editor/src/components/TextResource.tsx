import React, { useState } from 'react';
import { Button, ButtonColor, ButtonVariant, Select } from '@altinn/altinn-design-system';
import { Add, Close, Edit, Search } from '@navikt/ds-icons';
import classes from './TextResource.module.css';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentEditId, upsertTextResources } from '../features/appData/textResources/textResourcesSlice';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import {
  getAllTextResourceIds,
  getCurrentEditId,
  textResourceByLanguageAndIdSelector
} from '../selectors/textResourceSelectors';
import { generateRandomId } from 'app-shared/utils/generateRandomId';
import { useText } from '../hooks';
import { prepend } from 'app-shared/utils/arrayUtils';
import cn from 'classnames';

export interface TextResourceProps {
  description?: string;
  handleIdChange: (id: string) => void;
  label?: string;
  placeholder?: string;
  previewMode?: boolean;
  textResourceId?: string;
}

export const TextResource = ({
  description,
  handleIdChange,
  label,
  placeholder,
  previewMode,
  textResourceId,
}: TextResourceProps) => {
  const dispatch = useDispatch();

  const textResource = useSelector(textResourceByLanguageAndIdSelector(DEFAULT_LANGUAGE, textResourceId));
  const textResourceIds = useSelector(getAllTextResourceIds);
  const t = useText();
  const [isSearchMode, setIsSearchMode] = useState(false);

  const addTextResource = (id: string) => dispatch(upsertTextResources({
    language: DEFAULT_LANGUAGE,
    textResources: { [id]: '' }
  }));

  const editId = useSelector(getCurrentEditId);
  const setEditId = (id: string) => dispatch(setCurrentEditId(id));
  const isEditing = textResourceId && editId === textResourceId;

  const handleEditButtonClick = () => {
    if (textResourceId) {
      setEditId(textResourceId);
    } else {
      const id = generateRandomId(12);
      addTextResource(id);
      handleIdChange(id);
      setEditId(id);
    }
  };

  const searchOptions = prepend(
    textResourceIds.map((id) => ({ label: id, value: id })),
    { label: t('ux_editor.search_text_resources_none'), value: '' }
  );

  return (
    <span className={cn(
      classes.root,
      previewMode && classes.previewMode,
      isEditing && classes.isEditing,
      isSearchMode && classes.isSearching,
    )}>
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
            color={ButtonColor.Secondary}
            icon={<Close />}
            onClick={() => setIsSearchMode(false)}
            title={t('ux_editor.search_text_resources_close')}
            variant={ButtonVariant.Quiet}
          />
        </span>
      )}
      <span className={classes.textResource}>
        {textResource?.value ? (
          <>
            <span>{textResource.value}</span>
            <Button
              aria-label={t('general.edit')}
              className={classes.button}
              color={ButtonColor.Secondary}
              disabled={isEditing}
              icon={<Edit/>}
              onClick={handleEditButtonClick}
              title={t('general.edit')}
              variant={ButtonVariant.Quiet}
            />
          </>
        ) : (
          <>
            <span className={classes.placeholder}>{placeholder}</span>
            <Button
              aria-label={t('general.add')}
              className={classes.button}
              color={ButtonColor.Secondary}
              disabled={isEditing}
              icon={<Add />}
              onClick={handleEditButtonClick}
              title={t('general.add')}
              variant={ButtonVariant.Quiet}
            />
          </>
        )}
        <Button
          aria-label={t('general.search')}
          className={classes.button}
          color={ButtonColor.Secondary}
          disabled={isSearchMode}
          icon={<Search />}
          onClick={() => setIsSearchMode(true)}
          title={t('general.search')}
          variant={ButtonVariant.Quiet}
        />
      </span>
    </span>
  );
}
