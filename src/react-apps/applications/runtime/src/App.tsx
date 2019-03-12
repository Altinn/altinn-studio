import * as React from 'react';
import AltinnSpinner from 'Shared/components/AltinnSpinner';

const CreateSpinnerRow = (number: number) => {
  let spinners = [];
  for(let i = 0; i < number; i++) {
    spinners.push(<AltinnSpinner/>);
  }
  return spinners;
}

const CreateSpinners = (rows: number, items: number) => {
  let spinnerRows = [];
  for (let i = 0; i < rows; i++) {
    spinnerRows.push(
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center'
        }}
      >
        {CreateSpinnerRow(items)}
      </div>
    );
  }
  return spinnerRows;
}


export default () => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column'
    }}
  >
    {CreateSpinners(10, 10)}
  </div>
);