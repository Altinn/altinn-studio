import React, { useRef } from 'react';
import { IGenericEditComponent } from '../../../components/config/componentConfig';
import { RadioGroup } from '@digdir/design-system-react';
import { IFormRadioButtonComponent } from '../../../types/global';
import { generateRandomId } from 'app-shared/utils/generateRandomId';
import classes from './RadioGroupPreview.module.css';
import { TextResource } from '../../../components/TextResource';
import { useText } from '../../../hooks';
import {
  changeComponentOptionLabel,
  changeDescriptionBinding,
  changeTitleBinding,
} from '../../../utils/component';
import { AddOption } from '../../../components/AddOption';

export interface RadioGroupPreviewProps extends IGenericEditComponent {
  component: IFormRadioButtonComponent;
}

export const RadioGroupPreview = ({
  component,
  handleComponentChange,
}: RadioGroupPreviewProps) => {
  const t = useText();
  const tRadios = (key: string) => t(`ux_editor.radios_${key}`);

  const radioGroupName = useRef(generateRandomId(12));

  const changeOptionLabel = (value: string, label: string) =>
    handleComponentChange(changeComponentOptionLabel(component, value, label));

  const changeLegend = (legend: string) =>
    handleComponentChange(changeTitleBinding(component, legend));

  const changeDescription = (description: string) =>
    handleComponentChange(changeDescriptionBinding(component, description));

  return (
    <div className={classes.root}>
      <RadioGroup
        legend={(
          <TextResource
            handleIdChange={changeLegend}
            placeholder={tRadios('legend_placeholder')}
            previewMode
            textResourceId={component.textResourceBindings?.title}
          />
        )}
        description={(
          <TextResource
            handleIdChange={changeDescription}
            placeholder={tRadios('description_placeholder')}
            previewMode
            textResourceId={component.textResourceBindings?.description}
          />
        )}
        items={component.options?.map(({value, label}) => ({
          value,
          label: (
            <TextResource
              handleIdChange={(id) => changeOptionLabel(value, id)}
              placeholder={tRadios('option_label_placeholder')}
              previewMode
              textResourceId={label}
            />
          ),
        })) || []}
        name={radioGroupName.current}
        presentation
      />
      {!component.optionsId && (
        <AddOption<IFormRadioButtonComponent>
          addButtonClass={classes.addRadioButton}
          component={component}
          duplicateErrorText={tRadios('option_value_error_duplicate')}
          emptyErrorText={tRadios('option_value_error_empty')}
          handleComponentChange={handleComponentChange}
        />
      )}
    </div>
  );
};
