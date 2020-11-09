import * as React from 'react';
import {Typography} from '@material-ui/core';

function ConstItem({item}: any) {
  return (
    <div>
      <Typography>{item.name || item.id}: {item.value.find((v: any) => v.key === 'const').value}</Typography>
    </div>
  )
}

export default ConstItem;
