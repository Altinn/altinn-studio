import React from 'react';
import { Button, Grid } from '@material-ui/core';

export interface IRuleButtonProps {
  onClick: () => void;
  text: string;
}

export default function RuleButton(props: IRuleButtonProps) {
  return (
    <Button
      style={{
        width: '100%',
        fontSize: '1.4rem',
        fontWeight: 400,
        textTransform: 'unset',
        paddingLeft: 'unset',
        paddingRight: 'unset',
      }}
      onClick={props.onClick}
    >
      <Grid container={true} direction='row'>
        <Grid item={true} xs={1}>
          <i
            className='fa fa-settings a-btn-icon-symbol'
            style={{ width: 'auto' }}
          />
        </Grid>
        <Grid
          item={true}
          xs='auto'
          style={{ textAlign: 'left', marginLeft: '0.8rem' }}
        >
          {props.text}
        </Grid>
      </Grid>
    </Button>
  );
}
