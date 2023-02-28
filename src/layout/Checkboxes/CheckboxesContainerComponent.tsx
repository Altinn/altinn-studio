import React from 'react';

import { FormControlLabel, FormGroup, FormLabel } from '@material-ui/core';
import Checkbox from '@material-ui/core/Checkbox';
import FormControl from '@material-ui/core/FormControl';
import { makeStyles } from '@material-ui/core/styles';
import cn from 'classnames';
import type { CheckboxProps } from '@material-ui/core/Checkbox';

import { useHasChangedIgnoreUndefined } from 'src/common/hooks';
import { useAppSelector } from 'src/common/hooks/useAppSelector';
import { AltinnSpinner } from 'src/components/AltinnSpinner';
import { useGetOptions } from 'src/components/hooks';
import { useDelayedSavedState } from 'src/components/hooks/useDelayedSavedState';
import { shouldUseRowLayout } from 'src/utils/layout';
import { getOptionLookupKey } from 'src/utils/options';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IOption } from 'src/types';

export type ICheckboxContainerProps = PropsFromGenericComponent<'Checkboxes'>;

interface IStyledCheckboxProps extends CheckboxProps {
  label: string;
}

const useStyles = makeStyles((theme) => ({
  root: {
    '&:hover': {
      backgroundColor: 'transparent',
    },
  },
  icon: {
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

      backgroundImage:
        "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath fill='%23000000' d='M6.564.75l-3.59 3.612-1.538-1.55L0 4.26 2.974 7.25 8 2.193z'/%3E%3C/svg%3E\")",
      content: '""',
    },
    'input:hover ~ &': {
      borderColor: theme.altinnPalette.primary.blueDark,
    },
  },
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

const defaultOptions: IOption[] = [];
const defaultSelectedOptions: string[] = [];

export const CheckboxContainerComponent = ({
  id,
  options,
  optionsId,
  formData,
  preselectedOptionIndex,
  handleDataChange,
  layout,
  legend,
  readOnly,
  getTextResourceAsString,
  getTextResource,
  mapping,
  source,
}: ICheckboxContainerProps) => {
  const classes = useStyles();
  const apiOptions = useGetOptions({ optionsId, mapping, source });
  const calculatedOptions = apiOptions || options || defaultOptions;
  const hasSelectedInitial = React.useRef(false);
  const optionsHasChanged = useHasChangedIgnoreUndefined(apiOptions);
  const lookupKey = optionsId && getOptionLookupKey({ id: optionsId, mapping });
  const fetchingOptions = useAppSelector((state) => lookupKey && state.optionState.options[lookupKey]?.loading);

  const { value, setValue, saveValue } = useDelayedSavedState(handleDataChange, formData?.simpleBinding ?? '', 200);

  const selected = value && value.length > 0 ? value.split(',') : defaultSelectedOptions;

  React.useEffect(() => {
    const shouldSelectOptionAutomatically =
      !formData?.simpleBinding &&
      typeof preselectedOptionIndex !== 'undefined' &&
      preselectedOptionIndex >= 0 &&
      calculatedOptions &&
      preselectedOptionIndex < calculatedOptions.length &&
      hasSelectedInitial.current === false;

    if (shouldSelectOptionAutomatically) {
      setValue(calculatedOptions[preselectedOptionIndex].value, true);
      hasSelectedInitial.current = true;
    }
  }, [formData?.simpleBinding, calculatedOptions, setValue, preselectedOptionIndex]);

  React.useEffect(() => {
    if (optionsHasChanged && formData.simpleBinding) {
      // New options have been loaded, we have to reset form data.
      setValue(undefined, true);
    }
  }, [setValue, optionsHasChanged, formData]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const clickedItem = event.target.name;
    const isSelected = isOptionSelected(clickedItem);

    if (isSelected) {
      setValue(selected.filter((x) => x !== clickedItem).join(','));
    } else {
      setValue(selected.concat(clickedItem).join(','));
    }
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    // Only set value instantly if moving focus outside of the checkbox group
    if (!event.currentTarget.contains(event.relatedTarget)) {
      saveValue();
    }
  };

  const isOptionSelected = (option: string) => selected.includes(option);

  const RenderLegend = legend;

  return (
    <FormControl
      key={`checkboxes_control_${id}`}
      component='fieldset'
    >
      <FormLabel
        component='legend'
        classes={{ root: cn(classes.legend) }}
      >
        <RenderLegend />
      </FormLabel>
      <FormGroup
        row={shouldUseRowLayout({
          layout,
          optionsCount: calculatedOptions.length,
        })}
        id={id}
        key={`checkboxes_group_${id}`}
        onBlur={handleBlur}
      >
        {fetchingOptions ? (
          <AltinnSpinner />
        ) : (
          <>
            {calculatedOptions.map((option, index) => (
              <FormControlLabel
                tabIndex={-1}
                key={option.value}
                classes={{ root: cn(classes.formControl) }}
                disabled={readOnly}
                control={
                  <StyledCheckbox
                    checked={isOptionSelected(option.value)}
                    onChange={handleChange}
                    value={index}
                    key={option.value}
                    name={option.value}
                    label={getTextResourceAsString(option.label)}
                  />
                }
                label={getTextResource(option.label)}
              />
            ))}
          </>
        )}
      </FormGroup>
    </FormControl>
  );
};

const StyledCheckbox = ({ label, ...rest }: IStyledCheckboxProps) => {
  const classes = useStyles();

  return (
    <Checkbox
      className={classes.root}
      disableRipple={true}
      color='default'
      checkedIcon={<span className={cn(classes.icon, classes.checkedIcon)} />}
      icon={<span className={classes.icon} />}
      inputProps={{ 'aria-label': label }}
      {...rest}
    />
  );
};
