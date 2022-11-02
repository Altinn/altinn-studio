import React, { useMemo } from 'react';

import { makeStyles } from '@material-ui/core/styles';

import { useAppSelector, useHasChangedIgnoreUndefined } from 'src/common/hooks';
import { useGetOptions } from 'src/components/hooks';
import { useDelayedSavedState } from 'src/components/hooks/useDelayedSavedState';
import { getOptionLookupKey } from 'src/utils/options';
import type { IRadioButtonsContainerProps } from 'src/components/base/RadioButtons/RadioButtonsContainerComponent';

export const useRadioStyles = makeStyles((theme) => ({
  root: {
    '&:hover': {
      backgroundColor: 'transparent !important',
    },
  },
  icon: {
    borderRadius: '50%',
    border: `2px solid ${theme.altinnPalette.primary.blueMedium}`,
    width: 24,
    height: 24,
    backgroundColor: '#ffffff',
    '$root.Mui-focusVisible &': {
      outline: '2px solid #ff0000',
      outlineOffset: 0,
      outlineColor: theme.altinnPalette.primary.blueDark,
    },
    'input:hover ~ &': {
      borderColor: theme.altinnPalette.primary.blueDark,
    },
    'input:disabled ~ &': {
      boxShadow: 'none',
      background: 'rgba(206,217,224,.5)',
    },
  },
  checkedIcon: {
    backgroundColor: '#ffffff',
    '&:before': {
      display: 'block',
      width: 20,
      height: 20,
      backgroundImage: 'radial-gradient(#000,#000 30%,transparent 40%)',
      content: '""',
    },
    'input:hover ~ &': {
      borderColor: theme.altinnPalette.primary.blueDark,
    },
  },
  legend: {
    color: '#000000',
  },
  margin: {
    marginBottom: '1.2rem',
  },
}));

export const useRadioButtons = ({
  optionsId,
  options,
  handleDataChange,
  preselectedOptionIndex,
  formData,
  mapping,
  source,
}: IRadioButtonsContainerProps) => {
  const apiOptions = useGetOptions({ optionsId, mapping, source });
  const calculatedOptions = useMemo(
    () => apiOptions || options || [],
    [apiOptions, options],
  );
  const optionsHasChanged = useHasChangedIgnoreUndefined(apiOptions);
  const lookupKey = optionsId && getOptionLookupKey({ id: optionsId, mapping });
  const fetchingOptions =
    useAppSelector(
      (state) => lookupKey && state.optionState.options[lookupKey]?.loading,
    ) || undefined;
  const {
    value: selected,
    setValue,
    saveValue,
  } = useDelayedSavedState(
    handleDataChange,
    formData?.simpleBinding ?? '',
    200,
  );

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
  }, [
    formData?.simpleBinding,
    calculatedOptions,
    setValue,
    preselectedOptionIndex,
  ]);

  React.useEffect(() => {
    if (optionsHasChanged && formData.simpleBinding) {
      // New options have been loaded, we have to reset form data.
      setValue(undefined, true);
    }
  }, [setValue, optionsHasChanged, formData]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    // Only set value instantly if moving focus outside of the radio group
    if (!event.currentTarget.contains(event.relatedTarget)) {
      saveValue();
    }
  };
  return {
    handleChange,
    handleBlur,
    fetchingOptions,
    selected,
    calculatedOptions,
  };
};
