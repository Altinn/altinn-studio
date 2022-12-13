import React from 'react';
import { Button, ButtonColor, ButtonVariant } from '@altinn/altinn-design-system';
import { Add, Edit } from '@navikt/ds-icons';
import classes from './TextResource.module.css';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentEditId, upsertTextResources } from '../features/appData/textResources/textResourcesSlice';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { getCurrentEditId, textResourceByLanguageAndIdSelector } from '../selectors/textResourceSelectors';
import { generateRandomId } from 'app-shared/utils/generateRandomId';
import { useText } from '../hooks';

export interface TextResourceProps {
  description?: string;
  handleIdChange: (id: string) => void;
  label?: string;
  placeholder?: string;
  textResourceId?: string;
}

export const TextResource = ({
  description,
  handleIdChange,
  label,
  placeholder,
  textResourceId,
}: TextResourceProps) => {
  const dispatch = useDispatch();

  const textResource = useSelector(textResourceByLanguageAndIdSelector(DEFAULT_LANGUAGE, textResourceId));
  const t = useText();

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

  return (
    <div className={isEditing ? classes.isEditing : undefined}>
      {label && <p className={classes.label}>{label}</p>}
      {description && <p className={classes.description}>{description}</p>}
      <div className={classes.textResource}>
        {textResource?.value ? (
          <>
            <span>{textResource.value}</span>
            <Button
              aria-label={t('general.edit')}
              color={ButtonColor.Secondary}
              disabled={isEditing}
              icon={<Edit/>}
              onClick={handleEditButtonClick}
              variant={ButtonVariant.Quiet}
            />
          </>
        ) : (
          <>
            <span className={classes.placeholder}>{placeholder}</span>
            <Button
              aria-label={t('general.add')}
              color={ButtonColor.Secondary}
              disabled={isEditing}
              icon={<Add />}
              onClick={handleEditButtonClick}
              variant={ButtonVariant.Quiet}
            />
          </>
        )}
      </div>
    </div>
  );
}
