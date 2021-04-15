import * as React from 'react';
import { makeStyles,
  FormControl,
  Input,
  InputAdornment,
  IconButton } from '@material-ui/core';
import { CreateOutlined, DeleteOutline, DoneOutlined } from '@material-ui/icons';
import { TypeSelect } from './TypeSelect';
import { RefSelect } from './RefSelect';

const useStyles = makeStyles({
  field: {
    background: 'white',
    color: 'black',
    border: '1px solid #006BD8',
    padding: 4,
    margin: 8,
  },
  type: {
    background: 'white',
    color: 'black',
    border: '1px solid #006BD8',
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
  onChangeRef: (path: string, ref: string) => void;
  onDeleteField: (path: string, key: string) => void;
  isRef?: boolean;
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

  const onChangeValue = (val: any) => {
    let newValue = val;
    setValue(val);
    if (props.label === 'enum') {
      newValue = val.split(',');
    }
    props.onChangeValue(props.fullPath, newValue, props.label);
  };

  const onChangeType = (id: string, type: string) => {
    props.onChangeValue(props.fullPath, type, id);
  };

  const onChangeRef = (id: string, ref: string) => {
    props.onChangeRef(props.fullPath, ref);
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

  const toggleEditLabel = () => {
    setEditLabel(!editLabel);
  };
  const RenderValueField = () => {
    if (label === 'type') {
      return <TypeSelect
        itemType={value}
        id={label}
        onChange={onChangeType}
      />;
    }
    if (props.isRef) {
      return <RefSelect
        id={label}
        value={value}
        onChange={onChangeRef}
      />;
    }
    return <Input
      id={`${baseId}-value-${label}`}
      value={value}
      disableUnderline={true}
      onChange={(e) => onChangeValue(e.target.value)}
    />;
  };
  const baseId = `input-${props.fullPath.replace('#/definitions/', '')}`;
  return (
    <div>
      <span className={classes.inputs}>
        <FormControl>
          <Input
            id={`${baseId}-key-${label}`}
            value={label}
            disableUnderline={true}
            onChange={onChangeKey}
            onBlur={onBlurKey}
            disabled={!editLabel}
            className={classes.field}
            endAdornment={
              <InputAdornment position='end'>
                <IconButton onClick={toggleEditLabel} id={`${baseId}-toggle-${label}`}>
                  {editLabel ? <DoneOutlined /> : <CreateOutlined />}
                </IconButton>
              </InputAdornment>
            }
          />
        </FormControl>
        <FormControl className={classes.field}>
          <RenderValueField />
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
