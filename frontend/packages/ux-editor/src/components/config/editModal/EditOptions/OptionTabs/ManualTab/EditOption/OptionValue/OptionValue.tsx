import React from 'react';
import type { Option } from 'app-shared/types/Option';
import { useTextResourcesSelector } from '../../../../../../../../hooks';
import { textResourceByLanguageAndIdSelector } from '../../../../../../../../selectors/textResourceSelectors';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { StudioCodeFragment } from '@studio/components-legacy';
import type { ITextResource } from 'app-shared/types/global';
import classes from './OptionValue.module.css';

export type OptionValueProps = {
  option: Option;
};

export const OptionValue = ({ option }: OptionValueProps) => {
  const labelSelector = textResourceByLanguageAndIdSelector(DEFAULT_LANGUAGE, option.label);
  const labelResource = useTextResourcesSelector<ITextResource>(labelSelector);
  const labelValue = labelResource?.value;

  return (
    <div className={classes.optionValue}>
      {labelValue && <span>{labelValue}</span>}
      <StudioCodeFragment>{option.value}</StudioCodeFragment>
    </div>
  );
};
