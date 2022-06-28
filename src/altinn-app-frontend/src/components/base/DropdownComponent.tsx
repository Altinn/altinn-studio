import React from "react";
import { useAppSelector, useHasChangedIgnoreUndefined } from "src/common/hooks";
import type { IComponentProps } from "..";
import type { IMapping, IOptionSource } from "src/types";
import { getOptionLookupKey } from "src/utils/options";
import { AltinnSpinner, Select } from "altinn-shared/components";
import { useGetOptions } from "../hooks";

export interface IDropdownProps extends IComponentProps {
  optionsId?: string;
  mapping?: IMapping;
  preselectedOptionIndex?: number;
  source?: IOptionSource;
}

function DropdownComponent({
  optionsId,
  formData,
  preselectedOptionIndex,
  handleDataChange,
  id,
  readOnly,
  isValid,
  getTextResourceAsString,
  mapping,
  source,
}: IDropdownProps) {
  const options = useGetOptions({ optionsId, mapping, source });
  const fetchingOptions = useAppSelector(
    (state) =>
      state.optionState.options[getOptionLookupKey(optionsId, mapping)]?.loading
  );
  const hasSelectedInitial = React.useRef(false);
  const optionsHasChanged = useHasChangedIgnoreUndefined(options);

  React.useEffect(() => {
    const shouldSelectOptionAutomatically =
      !formData?.simpleBinding &&
      options &&
      preselectedOptionIndex >= 0 &&
      preselectedOptionIndex < options.length &&
      hasSelectedInitial.current === false;

    if (shouldSelectOptionAutomatically) {
      handleDataChange(options[preselectedOptionIndex].value);
      hasSelectedInitial.current = true;
    }
  }, [options, formData, preselectedOptionIndex, handleDataChange]);

  React.useEffect(() => {
    if (optionsHasChanged && formData.simpleBinding) {
      // New options have been loaded, we have to reset form data.
      // We also skip any required validations
      handleDataChange(undefined, "simpleBinding", true);
    }
  }, [handleDataChange, optionsHasChanged, formData]);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    handleDataChange(event.target.value);
  };

  const handleBlur = (event: React.FocusEvent<HTMLSelectElement>) => {
    handleDataChange(event.target.value);
  };

  return (
    <>
      {fetchingOptions ? (
        <AltinnSpinner />
      ) : (
        <Select
          id={id}
          onChange={handleChange}
          onBlur={handleBlur}
          value={formData?.simpleBinding}
          disabled={readOnly}
          error={!isValid}
          options={
            options?.map((option) => ({
              label: getTextResourceAsString(option.label),
              value: option.value,
            })) || []
          }
        />
      )}
    </>
  );
}

export default DropdownComponent;
