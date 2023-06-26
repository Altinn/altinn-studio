import React, { useMemo } from 'react';

import { makeStyles } from '@material-ui/core/styles';

import { useAppSelector } from 'src/hooks/useAppSelector';
import { useDelayedSavedState } from 'src/hooks/useDelayedSavedState';
import { useGetOptions } from 'src/hooks/useGetOptions';
import { useHasChangedIgnoreUndefined } from 'src/hooks/useHasChangedIgnoreUndefined';
import { getOptionLookupKey } from 'src/utils/options';
import type { IRadioButtonsContainerProps } from 'src/layout/RadioButtons/RadioButtonsContainerComponent';

export const useRadioStyles = makeStyles(() => ({
  legend: {
    color: '#000000',
    fontFamily: 'Altinn-DIN',
  },
  formControl: {
    alignItems: 'flex-start',
    marginBottom: '0.75rem',
    wordBreak: 'break-word',
    '& > span:last-child': {
      marginTop: 9,
    },
  },
}));

export const useRadioButtons = ({ node, handleDataChange, formData }: IRadioButtonsContainerProps) => {
  const { optionsId, options, preselectedOptionIndex, mapping, source } = node.item;
  const apiOptions = useGetOptions({ optionsId, mapping, source });
  const calculatedOptions = useMemo(() => apiOptions || options || [], [apiOptions, options]);
  const optionsHasChanged = useHasChangedIgnoreUndefined(apiOptions);
  const lookupKey = optionsId && getOptionLookupKey({ id: optionsId, mapping });
  const fetchingOptions =
    useAppSelector((state) => lookupKey && state.optionState.options[lookupKey]?.loading) || undefined;
  const {
    value: selected,
    setValue,
    saveValue,
  } = useDelayedSavedState(handleDataChange, formData?.simpleBinding ?? '', 200);

  React.useEffect(() => {
    const shouldPreselectItem =
      !formData?.simpleBinding &&
      typeof preselectedOptionIndex !== 'undefined' &&
      preselectedOptionIndex >= 0 &&
      calculatedOptions &&
      preselectedOptionIndex < calculatedOptions.length;
    if (shouldPreselectItem) {
      const preSelectedValue = calculatedOptions[preselectedOptionIndex].value;
      setValue(preSelectedValue, true);
    }
  }, [formData?.simpleBinding, calculatedOptions, setValue, preselectedOptionIndex]);

  React.useEffect(() => {
    if (optionsHasChanged && formData.simpleBinding) {
      // New options have been loaded, we have to reset form data.
      setValue(undefined, true);
    }
  }, [setValue, optionsHasChanged, formData]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);
  };

  const handleChangeRadioGroup = (value: string) => {
    setValue(value);
  };

  const handleBlur: React.FocusEventHandler = (event) => {
    // Only set value instantly if moving focus outside of the radio group
    if (!event.currentTarget.contains(event.relatedTarget)) {
      saveValue();
    }
  };
  return {
    handleChange,
    handleChangeRadioGroup,
    handleBlur,
    fetchingOptions,
    selected,
    calculatedOptions,
  };
};
