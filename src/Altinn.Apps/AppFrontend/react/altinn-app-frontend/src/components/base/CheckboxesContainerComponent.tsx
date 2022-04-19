import React from 'react';
import { FormControlLabel, FormGroup, FormLabel } from '@material-ui/core';
import Checkbox, { CheckboxProps } from '@material-ui/core/Checkbox';
import FormControl from '@material-ui/core/FormControl';
import { makeStyles } from '@material-ui/core/styles';
import cn from 'classnames';

import type { IComponentProps } from '..';
import type { IOption, IComponentValidations, IMapping, IOptionSource } from 'src/types';
import { LayoutStyle } from 'src/types';

import { shouldUseRowLayout } from 'src/utils/layout';

import { renderValidationMessagesForComponent } from '../../utils/render';
import { useAppSelector, useHasChangedIgnoreUndefined } from 'src/common/hooks';
import { getOptionLookupKey } from 'src/utils/options';
import { AltinnSpinner } from 'altinn-shared/components';
import { useGetOptions } from '../hooks';

export interface ICheckboxContainerProps extends IComponentProps {
  validationMessages: IComponentValidations;
  options?: IOption[];
  optionsId?: string;
  preselectedOptionIndex?: number;
  mapping?: IMapping;
  source?: IOptionSource;
  layout?: LayoutStyle;
}

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
    border: '2px solid #1EAEF7',
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
  },
  margin: {
    marginBottom: '1.2rem',
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
  handleFocusUpdate,
  layout,
  legend,
  getTextResourceAsString,
  getTextResource,
  validationMessages,
  mapping,
  source,
}: ICheckboxContainerProps) => {
  const classes = useStyles();
  const apiOptions = useGetOptions({ optionsId, mapping, source });
  const calculatedOptions = apiOptions || options || defaultOptions;
  const hasSelectedInitial = React.useRef(false);
  const optionsHasChanged = useHasChangedIgnoreUndefined(apiOptions);

  const fetchingOptions = useAppSelector(
    (state) =>
      state.optionState.options[getOptionLookupKey(optionsId, mapping)]
        ?.loading,
  );

  const selected = formData?.simpleBinding
    ? formData.simpleBinding.split(',')
    : defaultSelectedOptions;

  React.useEffect(() => {
    const shouldSelectOptionAutomatically =
      !formData?.simpleBinding &&
      preselectedOptionIndex >= 0 &&
      calculatedOptions &&
      preselectedOptionIndex < calculatedOptions.length &&
      hasSelectedInitial.current === false;

    if (shouldSelectOptionAutomatically) {
      handleDataChange(calculatedOptions[preselectedOptionIndex].value);
      hasSelectedInitial.current = true;
    }
  }, [
    formData?.simpleBinding,
    calculatedOptions,
    handleDataChange,
    preselectedOptionIndex,
  ]);

  React.useEffect(() => {
    if (optionsHasChanged && formData.simpleBinding) {
      // New options have been loaded, we have to reset form data.
      // We also skip any required validations
      handleDataChange(undefined, 'simpleBinding', true);
    }
  }, [handleDataChange, optionsHasChanged, formData]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const clickedItem = event.target.name;
    const isSelected = isOptionSelected(clickedItem);

    if (isSelected) {
      handleDataChange(selected.filter((x) => x !== clickedItem).join(','));
    } else {
      handleDataChange(selected.concat(clickedItem).join(','));
    }
    handleFocusUpdate(id);
  };

  const handleBlur = () => {
    handleDataChange(formData?.simpleBinding ?? '');
  };

  const isOptionSelected = (option: string) => selected.includes(option);

  const RenderLegend = legend;

  return (
    <FormControl key={`checkboxes_control_${id}`} component='fieldset'>
      <FormLabel component='legend' classes={{ root: cn(classes.legend) }}>
        <RenderLegend />
      </FormLabel>
      <FormGroup
        row={shouldUseRowLayout({
          layout,
          optionsCount: calculatedOptions.length,
        })}
        id={id}
        key={`checkboxes_group_${id}`}
      >
        {fetchingOptions ? (
          <AltinnSpinner />
        ) : (
          <>
            {calculatedOptions.map((option, index) => (
              <React.Fragment key={option.value}>
                <FormControlLabel
                  key={option.value}
                  classes={{ root: cn(classes.margin) }}
                  control={
                    <StyledCheckbox
                      checked={isOptionSelected(option.value)}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      value={index}
                      key={option.value}
                      name={option.value}
                      label={getTextResourceAsString(option.label)}
                    />
                  }
                  label={getTextResource(option.label)}
                />
                {validationMessages &&
                  isOptionSelected(option.value) &&
                  renderValidationMessagesForComponent(
                    validationMessages.simpleBinding,
                    id,
                  )}
              </React.Fragment>
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
