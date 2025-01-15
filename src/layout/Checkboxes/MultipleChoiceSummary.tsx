import React from 'react';

import { Flex } from 'src/app-components/Flex/Flex';
import { useDisplayDataProps } from 'src/features/displayData/useDisplayData';
import { Lang } from 'src/features/language/Lang';
import classes from 'src/layout/Checkboxes/MultipleChoiceSummary.module.css';
import type { DisplayDataProps } from 'src/features/displayData';

export interface IMultipleChoiceSummaryProps {
  getFormData: (displayDataProps: DisplayDataProps) => { [key: string]: string };
}

export function MultipleChoiceSummary({ getFormData }: IMultipleChoiceSummaryProps) {
  const props = useDisplayDataProps();
  const formData = getFormData(props);

  return (
    <Flex
      item
      size={{ xs: 12 }}
      data-testid='multiple-choice-summary'
    >
      {Object.keys(formData).length === 0 ? (
        <span className={classes.emptyField}>
          <Lang id='general.empty_summary' />
        </span>
      ) : (
        <ul className={classes.list}>
          {Object.keys(formData).map((key) => (
            <li
              key={key}
              className={classes.listItem}
            >
              <div className={classes.data}>{formData[key]}</div>
            </li>
          ))}
        </ul>
      )}
    </Flex>
  );
}
