import React, { useState } from "react";
import classes from "./AddOption.module.css";
import { TextResource } from "./TextResource";
import { Button, LegacyFieldSet, TextField } from "@digdir/design-system-react";
import { IGenericEditComponent } from "./config/componentConfig";
import { IOption } from "../types/global";
import { PlusIcon } from "@navikt/aksel-icons";
import { useText } from "../hooks";
import { addOptionToComponent, generateRandomOption } from "../utils/component";
import {
  FormCheckboxesComponent,
  FormRadioButtonsComponent,
} from "../types/FormComponent";

export interface AddOptionProps<
  T extends FormCheckboxesComponent | FormRadioButtonsComponent,
> extends IGenericEditComponent {
  addButtonClass: string;
  component: T;
  duplicateErrorText: string;
  emptyErrorText: string;
}

export const AddOption = <
  T extends FormCheckboxesComponent | FormRadioButtonsComponent,
>({
  addButtonClass,
  component,
  duplicateErrorText,
  emptyErrorText,
  handleComponentChange,
}: AddOptionProps<T>) => {
  const t = useText();

  const [isAddMode, setIsAddMode] = useState(false);
  const [newOption, setNewOption] = useState(generateRandomOption());

  const isNewValueUnique = !component.options?.some(
    (option) => option.value === newOption.value,
  );
  const isNewValueEmpty = newOption.value === "";
  const isNewValueValid = isNewValueUnique && !isNewValueEmpty;
  let errorMessage: string | undefined = undefined;

  if (isNewValueEmpty) {
    errorMessage = emptyErrorText;
  } else if (!isNewValueUnique) {
    errorMessage = duplicateErrorText;
  }

  const addOption = (
    event: React.MouseEvent<HTMLButtonElement>,
    option: IOption,
  ) => {
    event.stopPropagation();
    handleComponentChange(addOptionToComponent(component, option));
    setIsAddMode(false);
    setNewOption(generateRandomOption());
  };

  return isAddMode ? (
    <div className={classes.addSection}>
      <LegacyFieldSet
        className={classes.fieldSetContent}
        error={errorMessage}
        legend={t("ux_editor.add_option")}
      >
        <div className={classes.addSectionFields}>
          <TextResource
            label={t("ux_editor.add_option_label")}
            textResourceId={newOption.label}
            handleIdChange={(id) => setNewOption({ ...newOption, label: id })}
            placeholder={t("ux_editor.add_option_label_add")}
          />
          <div>
            <TextField
              isValid={isNewValueValid}
              label={t("ux_editor.add_option_value")}
              onChange={(e) =>
                setNewOption({ ...newOption, value: e.target.value })
              }
              value={newOption.value}
            />
          </div>
        </div>
        <div className={classes.addButtons}>
          <Button
            disabled={!isNewValueValid}
            onClick={(event: React.MouseEvent<HTMLButtonElement>) =>
              addOption(event, newOption)
            }
            title={t("general.add")}
            size="small"
          >
            {t("general.add")}
          </Button>
          <Button
            onClick={() => setIsAddMode(false)}
            title={t("general.cancel")}
            size="small"
          >
            {t("general.cancel")}
          </Button>
        </div>
      </LegacyFieldSet>
    </div>
  ) : (
    <div>
      <Button
        className={classes.addButton}
        onClick={() => setIsAddMode(true)}
        color="success"
        title={t("ux_editor.add_option")}
        variant="quiet"
        size="small"
      >
        <span className={addButtonClass}>
          <PlusIcon />
        </span>
        {t("ux_editor.add_option")}
      </Button>
    </div>
  );
};
