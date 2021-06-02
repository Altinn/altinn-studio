import * as React from 'react';
import { makeStyles,
  FormControl,
  Input,
  IconButton } from '@material-ui/core';
import { DeleteOutline } from '@material-ui/icons';
import { TypeSelect } from './TypeSelect';
import { RefSelect } from './RefSelect';
import { ILanguage } from '../types';

const useStyles = (readonly?: boolean) => makeStyles({
  field: {
    background: 'white',
    color: 'black',
    border: readonly ? '1px solid grey' : '1px solid #006BD8',
    boxSsizing: 'border-box',
    padding: 4,
    margin: 12,
    minWidth: 150,
    maxWidth: 200,
    '&.Mui-disabled': {
      background: '#f4f4f4',
      color: 'black',
      border: '1px solid #6A6A6A',
      boxSizing: 'border-box',
    },
  },
  inline: {
    display: 'inline-block',
  },
  label: {
    margin: 12,
  },
  container: {
    display: 'flex',
    flexDirection: 'row',
    '& >.MuiFormControl-root': {
      width: 200,
    },
  },
  delete: {
    marginLeft: '8px',
    marginTop: '12px',
    padding: '12px',
  },
});

export interface IInputFieldProps {
  value: string;
  label: string;
  fullPath: string;
  language: ILanguage;
  onChangeValue: (path: string, value: any, key?: string) => void;
  onChangeKey: (path: string, oldKey: string, newKey: string) => void;
  onChangeRef?: (path: string, ref: string) => void;
  onDeleteField?: (path: string, key: string) => void;
  isRef?: boolean;
  readOnly?: boolean;
}

export function InputField(props: IInputFieldProps) {
  const classes = useStyles(props.readOnly)();

  const [label, setLabel] = React.useState<string>(props.label || '');

  React.useEffect(() => {
    setLabel(props.label);
  }, [props.label]);

  const onChangeValue = (val: string) => {
    const newValue = props.label === 'enum' ? val.split(',') : val;
    props.onChangeValue(props.fullPath, newValue, props.label);
  };

  const onChangeType = (id: string, type: string) => {
    props.onChangeValue(props.fullPath, type, id);
  };

  const onChangeRef = (id: string, ref: string) => {
    props.onChangeRef?.(props.fullPath, ref);
  };

  const onChangeKey = (e: any) => {
    setLabel(e.target.value);
  };

  const onBlurKey = (e: any) => {
    props.onChangeKey(props.fullPath, props.label, e.target.value);
  };

  const onClickDelete = () => {
    props.onDeleteField?.(props.fullPath, props.label);
  };

  const renderValueField = () => {
    if (label === 'type') {
      return <TypeSelect
        language={props.language}
        readOnly={props.readOnly}
        value={props.value}
        id={label}
        onChange={onChangeType}
      />;
    }
    if (props.isRef) {
      return <RefSelect
        id={label}
        value={props.value}
        readOnly={props.readOnly}
        onChange={onChangeRef}
      />;
    }
    return <Input
      id={`${baseId}-value-${label}`}
      disabled={props.readOnly}
      className={classes.field}
      value={props.value}
      disableUnderline={true}
      onChange={(e) => onChangeValue(e.target.value)}
    />;
  };
  const baseId = `input-${props.fullPath.replace('#/definitions/', '').replace(/\//g, '-')}`;
  return (
    <div className={classes.container}>
      <FormControl>
        <Input
          id={`${baseId}-key-${label}`}
          value={label}
          disableUnderline={true}
          disabled={props.readOnly}
          onChange={onChangeKey}
          onBlur={onBlurKey}
          className={classes.field}
        />
      </FormControl>
      <FormControl>
        { renderValueField() }
      </FormControl>
      { props.onDeleteField &&
      <IconButton
        id={`${baseId}-delete-${label}`}
        aria-label='Delete field'
        onClick={onClickDelete}
        className={classes.delete}
      >
        <DeleteOutline/>
      </IconButton>
      }
    </div>
  );
}
