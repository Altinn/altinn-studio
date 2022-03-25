import React from 'react';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Radio, { RadioProps } from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import { makeStyles } from '@material-ui/core/styles';
import { FormLabel } from '@material-ui/core';
import cn from 'classnames';

import { renderValidationMessagesForComponent } from '../../utils/render';
import { useAppSelector, useHasChangedIgnoreUndefined } from 'src/common/hooks';
import { IComponentProps } from '..';
import { IMapping, LayoutStyle } from 'src/types';
import { getOptionLookupKey } from 'src/utils/options';
import { AltinnSpinner } from 'altinn-shared/components';
import { shouldUseRowLayout } from 'src/utils/layout';

export interface IRadioButtonsContainerProps extends IComponentProps {
  validationMessages?: any;
  options: any[];
  optionsId: string;
  preselectedOptionIndex: number;
  title: string;
  mapping?: IMapping;
  layout?: LayoutStyle;
}

const useStyles = makeStyles((theme) => ({
  root: {
    '&:hover': {
      backgroundColor: 'transparent !important',
    },
  },
  icon: {
    borderRadius: '50%',
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

const defaultArray = [];

export const RadioButtonContainerComponent = ({
  id,
  optionsId,
  options,
  handleFocusUpdate,
  handleDataChange,
  preselectedOptionIndex,
  formData,
  layout,
  legend,
  title,
  shouldFocus,
  getTextResource,
  validationMessages,
  mapping,
}: IRadioButtonsContainerProps) => {
  const classes = useStyles();

  const selected = formData?.simpleBinding ?? '';
  const apiOptions = useAppSelector(
    (state) =>
      state.optionState.options[getOptionLookupKey(optionsId, mapping)]
        ?.options,
  );
  const calculatedOptions = apiOptions || options || defaultArray;
  const optionsHasChanged = useHasChangedIgnoreUndefined(apiOptions);
  const fetchingOptions = useAppSelector(
    (state) =>
      state.optionState.options[getOptionLookupKey(optionsId, mapping)]
        ?.loading,
  );

  React.useEffect(() => {
    const shouldPreselectItem =
      !formData?.simpleBinding &&
      preselectedOptionIndex >= 0 &&
      calculatedOptions &&
      preselectedOptionIndex < calculatedOptions.length;
    if (shouldPreselectItem) {
      const preSelectedValue = calculatedOptions[preselectedOptionIndex].value;
      handleDataChange(preSelectedValue);
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
    handleFocusUpdate(id);
    handleDataChange(event.target.value);
  };

  const handleBlur = () => {
    handleDataChange(formData?.simpleBinding ?? '');
  };

  const RenderLegend = legend;

  return (
    <FormControl component='fieldset'>
      <FormLabel component='legend' classes={{ root: cn(classes.legend) }}>
        <RenderLegend />
      </FormLabel>
      {fetchingOptions ? (
        <AltinnSpinner />
      ) : (
        <RadioGroup
          aria-label={title}
          name={title}
          value={selected}
          onBlur={handleBlur}
          onChange={handleChange}
          row={shouldUseRowLayout({
            layout,
            optionsCount: calculatedOptions.length,
          })}
          id={id}
        >
          {calculatedOptions.map((option: any, index: number) => (
            <React.Fragment key={index}>
              <FormControlLabel
                control={
                  <StyledRadio
                    autoFocus={shouldFocus && selected === option.value}
                  />
                }
                label={getTextResource(option.label)}
                value={option.value}
                classes={{ root: cn(classes.margin) }}
              />
              {validationMessages &&
                selected === option.value &&
                renderValidationMessagesForComponent(
                  validationMessages.simpleBinding,
                  id,
                )}
            </React.Fragment>
          ))}
        </RadioGroup>
      )}
    </FormControl>
  );
};

const StyledRadio = (radioProps: RadioProps) => {
  const classes = useStyles();

  return (
    <Radio
      className={classes.root}
      disableRipple={true}
      checkedIcon={<span className={cn(classes.icon, classes.checkedIcon)} />}
      icon={<span className={classes.icon} />}
      {...radioProps}
    />
  );
};
