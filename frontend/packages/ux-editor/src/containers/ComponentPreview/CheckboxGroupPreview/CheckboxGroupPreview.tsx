import React, { useState } from 'react';
import { IGenericEditComponent } from '../../../components/config/componentConfig';
import { Button, ButtonColor, ButtonVariant, CheckboxGroup, FieldSet, TextField } from '@altinn/altinn-design-system';
import { IFormCheckboxComponent, IOptions } from '../../../types/global';
import { generateRandomId } from 'app-shared/utils/generateRandomId';
import classes from './CheckboxGroupPreview.module.css';
import { Add } from '@navikt/ds-icons';
import { TextResource } from '../../../components/TextResource';
import { useText } from '../../../hooks';

export interface CheckboxGroupPreviewProps extends IGenericEditComponent {
  component: IFormCheckboxComponent;
}

const initialNewOption = () => ({ label: generateRandomId(12), value: generateRandomId(4) });

export const CheckboxGroupPreview = ({
  component,
  handleComponentChange,
}: CheckboxGroupPreviewProps) => {
  const t = useText();
  const tCheckboxes = (key: string) => t(`ux_editor.checkboxes_${key}`);

  const [isAddMode, setIsAddMode] = useState(false);
  const [newOption, setNewOption] = useState(initialNewOption());

  const isNewValueUnique = !component.options?.some((option) => option.value === newOption.value);
  const isNewValueEmpty = newOption.value === '';
  const isNewValueValid = isNewValueUnique && !isNewValueEmpty;
  let errorMessage: string | undefined = undefined;

  const changeOptionLabel = (value: string, label: string) => {
    const newOptions = component.options?.map((option) => {
      return option.value === value ? { ...option, label } : option;
    });
    handleComponentChange({ ...component, options: newOptions });
  };

  const changeLegend = (legend: string) => {
    handleComponentChange({
      ...component,
      textResourceBindings: {
        ...component.textResourceBindings,
        title: legend,
      }
    });
  };

  const changeDescription = (description: string) => {
    handleComponentChange({
      ...component,
      textResourceBindings: {
        ...component.textResourceBindings,
        description,
      }
    });
  };

  if (isNewValueEmpty) {
    errorMessage = tCheckboxes('option_value_error_empty');
  } else if (!isNewValueUnique) {
    errorMessage = tCheckboxes('option_value_error_duplicate');
  }

  const addOption = (option: IOptions) => {
    handleComponentChange({
      ...component,
      options: [
        ...component.options,
        option,
      ],
    });
    setIsAddMode(false);
    setNewOption(initialNewOption());
  };

  return (
    <div className={classes.root}>
      <CheckboxGroup
        legend={(
          <TextResource
            handleIdChange={changeLegend}
            placeholder={tCheckboxes('legend_placeholder')}
            previewMode
            textResourceId={component.textResourceBindings?.title}
          />
        )}
        description={(
          <TextResource
            handleIdChange={changeDescription}
            placeholder={tCheckboxes('description_placeholder')}
            previewMode
            textResourceId={component.textResourceBindings?.description}
          />
        )}
        items={component.options?.map(({value, label}) => ({
          name: value,
          label: (
            <TextResource
              handleIdChange={(id) => changeOptionLabel(value, id)}
              placeholder={tCheckboxes('option_label_placeholder')}
              previewMode
              textResourceId={label}
            />
          ),
        })) || []}
        presentation
      />
      {!component.optionsId && (
        isAddMode ? (
          <div className={classes.addSection}>
            <FieldSet
              error={errorMessage}
              legend={tCheckboxes('add')}
            >
              <div className={classes.addSectionFields}>
                <TextResource
                  label={tCheckboxes('option_label')}
                  textResourceId={newOption.label}
                  handleIdChange={(id) => setNewOption({ ...newOption, label: id })}
                  placeholder={tCheckboxes('option_label_add')}
                />
                <div>
                  <TextField
                    isValid={isNewValueValid}
                    label={tCheckboxes('option_value')}
                    onChange={(e) => setNewOption({ ...newOption, value: e.target.value })}
                    value={newOption.value}
                  />
                </div>
              </div>
              <div className={classes.addButtons}>
                <Button
                  disabled={!isNewValueValid}
                  onClick={() => addOption(newOption)}
                  title={t('general.add')}
                >
                  {t('general.add')}
                </Button>
                <Button
                  onClick={() => setIsAddMode(false)}
                  title={t('general.cancel')}
                >
                  {t('general.cancel')}
                </Button>
              </div>
            </FieldSet>
          </div>
        ) : (
          <Button
            className={classes.addButton}
            onClick={() => setIsAddMode(true)}
            color={ButtonColor.Success}
            title={tCheckboxes('add')}
            variant={ButtonVariant.Quiet}
          >
          <span className={classes.addCheckbox}>
            <Add/>
          </span>
            {tCheckboxes('add')}
          </Button>
        )
      )}
    </div>
  );
};
