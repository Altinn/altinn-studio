import * as React from 'react';
import { makeStyles,
  FormControl,
  Input,
  InputAdornment,
  IconButton } from '@material-ui/core';
import {CreateOutlined, DeleteOutline, DoneOutlined} from '@material-ui/icons';
import { TypeSelect } from './TypeSelect';

const useStyles = makeStyles({
  root: {
    margin: 12,
  },
  rootKey: {
    margin: 12,
  },
  inline: {
    display: 'inline-block',
  },
  label: {
    margin: 12,
  },
  inputs: {
    flexGrow: 1,
  },
  container: {
    display: 'flex',
    flexDirection: 'row',
  },
  delete: {
    flex: '0 0 auto',
  }
});

export interface IInputFieldProps {
  value: string;
  label: string;
  fullPath: string;
  onChangeValue: (path: string, value: any, key?: string) => void;
  onChangeKey: (path: string, oldKey: string, newKey: string) => void;
  onDeleteField: (path: string, key: string) => void;
}

export function InputField(props: IInputFieldProps) {
  const classes = useStyles();
  const [value, setValue] = React.useState<string>(props.value || '');
  const [label, setLabel] = React.useState<string>(props.label || '');
  const [editLabel, setEditLabel] = React.useState<boolean>(false);

  React.useEffect(() => {
    setValue(props.value);
  }, [props.value]);

  React.useEffect(() => {
    setLabel(props.label);
  }, [props.label]);

  const onChangeValue = (e: any) => {
    setValue(e.target.value);
    let newValue = e.target.value;
    if (props.label === 'enum') {
      newValue = e.target.value.split(',');
    }
    props.onChangeValue(props.fullPath, newValue, props.label);
  };

  const onChangeType = (id: string, type: string) => {
    props.onChangeValue(props.fullPath, type, id);
  };

  const onChangeKey = (e: any) => {
    setLabel(e.target.value);
  };

  const onBlurKey = (e: any) => {
    props.onChangeKey(props.fullPath, props.label, e.target.value);
  };

  const onClickDelete = () => {
    props.onDeleteField(props.fullPath, props.label);
  };

  const toggleEditLabel = (e: any) => {
    setEditLabel(!editLabel);
  };

  return (
      <div>
        <span className={classes.inputs}>
          <FormControl>
            <Input
              id={`input-${props.fullPath}-key-${label}`}
              value={label}
              onChange={onChangeKey}
              onBlur={onBlurKey}
              disabled={!editLabel}
              className={classes.rootKey}
              endAdornment={
                <InputAdornment position='end'>
                  <IconButton onClick={toggleEditLabel}>
                    {editLabel ? <DoneOutlined /> : <CreateOutlined />}
                  </IconButton>
                </InputAdornment>
              }
            />
          </FormControl>
          <FormControl>
            {label === 'type' ? 
              <TypeSelect 
                itemType={value}
                id={label}
                onChange={onChangeType}
              />
            :
              <Input
                value={value}
                onChange={onChangeValue}
                className={classes.root}
              />
          }
          </FormControl>
        </span>
        <IconButton
            aria-label='Delete field'
            onClick={onClickDelete}
          >
            <DeleteOutline/>
          </IconButton>
      </div>
  )
}
