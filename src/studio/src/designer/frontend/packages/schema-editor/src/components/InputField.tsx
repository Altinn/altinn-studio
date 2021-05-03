import * as React from 'react';
import { makeStyles,
  FormControl,
  Input,
  IconButton } from '@material-ui/core';
import { DeleteOutline } from '@material-ui/icons';
import { TypeSelect } from './TypeSelect';
import { RefSelect } from './RefSelect';

const useStyles = (readonly?: boolean) => makeStyles({
  field: {
    background: 'white',
    color: 'black',
    border: readonly ? '1px solid grey' : '1px solid #006BD8',
    boxSsizing: 'border-box',
    padding: 4,
    margin: 8,
    minWidth: 60,
    maxWidth: 200,
  },
  readonly: {
    border: '1px solid grey',
  },
  type: {
    background: 'white',
    color: 'black',
    border: '1px solid #006BD8',
    boxSsizing: 'border-box',
    margin: 8,
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
  },
});

export interface IInputFieldProps {
  value: string;
  label: string;
  fullPath: string;
  onChangeValue: (path: string, value: any, key?: string) => void;
  onChangeKey: (path: string, oldKey: string, newKey: string) => void;
  onChangeRef?: (path: string, ref: string) => void;
  onDeleteField: (path: string, key: string) => void;
  isRef?: boolean;
  readOnly?: boolean;
}

export function InputField(props: IInputFieldProps) {
  const classes = useStyles(props.readOnly)();

  const [value, setValue] = React.useState<string>(props.value || '');
  const [label, setLabel] = React.useState<string>(props.label || '');

  React.useEffect(() => {
    setValue(props.value);
  }, [props.value]);

  React.useEffect(() => {
    setLabel(props.label);
  }, [props.label]);

  const onChangeValue = (val: string) => {
    setValue(val);
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
    props.onDeleteField(props.fullPath, props.label);
  };

  const renderValueField = () => {
    if (label === 'type') {
      return <TypeSelect
        readOnly={props.readOnly}
        itemType={value}
        id={label}
        onChange={onChangeType}
      />;
    }
    if (props.isRef) {
      return <RefSelect
        id={label}
        value={value}
        readOnly={props.readOnly}
        onChange={onChangeRef}
      />;
    }
    return <Input
      id={`${baseId}-value-${label}`}
      disabled={props.readOnly}
      className={classes.field}
      value={value}
      disableUnderline={true}
      onChange={(e) => onChangeValue(e.target.value)}
    />;
  };
  const baseId = `input-${props.fullPath.replace('#/definitions/', '').replace(/\//g, '-')}`;
  return (
    <div>
      <span className={classes.inputs}>
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
      </span>
      <IconButton
        id={`${baseId}-delete-${label}`}
        aria-label='Delete field'
        onClick={onClickDelete}
      >
        <DeleteOutline/>
      </IconButton>
    </div>
  );
}
