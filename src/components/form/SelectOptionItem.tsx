import React from 'react';

import classes from 'src/components/form/SelectOptionItem.module.css';

type ISelectOptionItemProps = {
  label: string;
  listHasDescription: boolean;
  description?: string;
};

export function SelectOptionItem({ label, listHasDescription, description }: ISelectOptionItemProps) {
  if (description) {
    return (
      <>
        <span className={classes.optionLabelSemiBold}>{label}</span>
        <br />
        <span>{description}</span>
      </>
    );
  } else {
    return <span className={listHasDescription ? classes.optionLabelSemiBold : ''}>{label}</span>;
  }
}
