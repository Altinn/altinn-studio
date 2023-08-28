import React from 'react';

import classes from 'src/components/form/SelectOptionItem.module.css';
import { useLanguage } from 'src/hooks/useLanguage';
import type { IOption } from 'src/layout/common.generated';

type ISelectOptionItemProps = {
  option: IOption;
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
