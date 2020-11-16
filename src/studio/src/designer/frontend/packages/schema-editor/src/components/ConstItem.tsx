import * as React from 'react';
import {Typography} from '@material-ui/core';

function ConstItem({item}: any) {
  const getValue = () => {
    if (item.value) {
      return item.value;
    }
    if (item.fields) {
      return item.fields.find((v: any) => v.key === 'const').value;
    }
  };

  return (
    <div>
      <Typography>{item.name || item.id}: {getValue()}</Typography>
    </div>
  )
}

export default ConstItem;
