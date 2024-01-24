import React from 'react';

import classes from 'src/components/form/SelectOptionItem.module.css';
import { useLanguage } from 'src/features/language/useLanguage';
import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';

type ISelectOptionItemProps = {
  option: IOptionInternal;
  listHasDescription: boolean;
};

export function SelectOptionItem({ option, listHasDescription }: ISelectOptionItemProps) {
  const { langAsString } = useLanguage();
  if (option.description) {
    return (
      <>
        <span className={classes.optionLabelSemiBold}>{langAsString(option.label ?? option.value)}</span>
        <br />
        <span>{langAsString(option.description)}</span>
      </>
    );
  } else {
    return (
      <span className={listHasDescription ? classes.optionLabelSemiBold : ''}>
        {langAsString(option.label ?? option.value)}
      </span>
    );
  }
}
