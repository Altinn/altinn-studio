import * as React from 'react';
import { MenuItem, Select, TextField, makeStyles } from '@material-ui/core'
import Modal from '../../../../shared/components/molecules/AltinnModal';
import { UiSchemaItem } from '../types';

const useStyles = makeStyles({
  row: {
    paddingTop: '1.6em',
  },
});

export interface IAddPropertyModal {
  isOpen: boolean;
  path: string;
  sharedTypes: UiSchemaItem[];
  onClose: (item: any) => void;
}

function AddPropertyModal(props: IAddPropertyModal) {
  const { isOpen } = props;
  const classes = useStyles();

  const [property, setProperty] = React.useState<any>({ name: '' });
  const [typeList, setTypeList] = React.useState<any[]>([]);

  React.useEffect(() => {
    setTypeList(props.sharedTypes.map((item) => item.name));
  }, [props.sharedTypes]);

  const onCloseModal = () => {
    console.log('property: ', property);
    props.onClose(property);
  }

  const onChangeProperty = (event: any) => {
    const name = event.target.value;
    const item = props.sharedTypes.find((item) => item.name === name);
    setProperty(item);
  }
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCloseModal}
      allowCloseOnBackdropClick={true}
    >
      <div className={classes.row}>
        <Select
          onChange={onChangeProperty}
          fullWidth={true}
        >
          {typeList.map((typeName) => <MenuItem value={typeName}>{typeName}</MenuItem>)}
        </Select>
      </div>
      <div className={classes.row}>
        <TextField
        value={property.name}
        onChange={onChangeProperty}
        fullWidth={true}
        />
      </div>
    </Modal>
  );
}

export default AddPropertyModal;