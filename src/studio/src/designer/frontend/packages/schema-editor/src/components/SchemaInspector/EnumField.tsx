import React, { KeyboardEvent, useEffect, useState } from 'react';
import { Grid, IconButton, makeStyles } from '@material-ui/core';
import { DeleteOutline } from '@material-ui/icons';
import { getTranslation } from '../../utils/language';
import { getDomFriendlyID } from '../../utils/schema';
import type { ILanguage } from '../../types';
import { TextField } from "@altinn/altinn-design-system";

export interface IEnumFieldProps {
  path: string;
  value: string;
  language: ILanguage;
  readOnly?: boolean;
  fullWidth?: boolean;
  onChange: (value: string, oldValue?: string) => void;
  onDelete?: (path: string, key: string) => void;
  onEnterKeyPress?: () => void;
}

const useStyles = makeStyles({
  delete: {
    marginLeft: '8px',
    padding: '12px',
  },
});

export const EnumField = (props: IEnumFieldProps) => {
  const classes = useStyles();
  const [val, setVal] = useState(props.value);
  useEffect(() => {
    setVal(props.value);
  }, [props.value]);

  const onBlur = () => {
    props.onChange(val, props.value);
  };

  const onChange = (e: any) => {
    e.stopPropagation();
    setVal(e.target.value);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) =>
    e?.key === 'Enter' && props.onEnterKeyPress && props.onEnterKeyPress();

  const baseId = getDomFriendlyID(props.path);
  return (
    <>
      <Grid item xs={9}>
        <TextField
          id={`${baseId}-enum-${props.value}`}
          disabled={props.readOnly}
          value={val}
          onChange={onChange}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          autoFocus
        />
      </Grid>
      {props.onDelete && (
        <Grid item xs={3}>
          <IconButton
            id={`${baseId}-delete-${props.value}`}
            aria-label={getTranslation('delete_field', props.language)}
            onClick={() => props.onDelete?.(props.path, props.value)}
            className={classes.delete}
          >
            <DeleteOutline />
          </IconButton>
        </Grid>
      )}
    </>
  );
};
