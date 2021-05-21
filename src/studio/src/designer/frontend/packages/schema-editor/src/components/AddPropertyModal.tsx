import * as React from 'react';
import { MenuItem, Select, TextField, makeStyles } from '@material-ui/core';
import Modal from '../../../../shared/components/molecules/AltinnModal';
import { UiSchemaItem } from '../types';

const useStyles = makeStyles({
  row: {
    paddingTop: '1.6em',
  },
  select: {
    fontSize: '1.2em',
  },
  customInput: {
    border: 'none',
    fontSize: '1.2em',
    borderBottom: '1px solid #022F51',
    marginBottom: '1.2em',
    background: 'none',
    cursor: 'pointer',
  },
  closeButton: {
    marginTop: '1.6em',
  },
});

export interface IAddPropertyModal {
  isOpen: boolean;
  path: string;
  sharedTypes: UiSchemaItem[];
  title: string;
  onClose: () => void;
  onConfirm: (item: UiSchemaItem) => void;
}

function AddPropertyModal(props: IAddPropertyModal) {
  const { isOpen } = props;
  const classes = useStyles();

  const [property, setProperty] = React.useState<UiSchemaItem>({ displayName: '', id: '' });
  const [typeList, setTypeList] = React.useState<any[]>([]);
  const [showCustom, setShowCustom] = React.useState<boolean>(false);

  React.useEffect(() => {
    setTypeList(props.sharedTypes.map((item) => item.displayName));
  }, [props.sharedTypes]);

  const onCloseModal = () => {
    props.onClose();
  };
  const onConfirm = () => {
    props.onConfirm(property);
  };

  const onChangeProperty = (event: any) => {
    const name = event.target.value;
    const propertyItem = props.sharedTypes.find((item) => item.displayName === name);
    if (propertyItem) {
      setProperty(propertyItem);
    }
  };

  const onChangeCustomProperty = (event: any) => {
    const propertyItem: UiSchemaItem = {
      displayName: event.target.value,
      id: `#/definitions/${event.target.value}`,
    };
    setProperty(propertyItem);
  };

  const onShowCustomClick = () => {
    setShowCustom(true);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCloseModal}
      allowCloseOnBackdropClick={true}
      closeButtonOutsideModal={true}
      headerText={props.title}
    >
      <div className={classes.row}>
        <h6>Velg fra listen</h6>
        <Select
          onChange={onChangeProperty}
          fullWidth={true}
          className={classes.select}
        >
          {typeList.map((typeName) => <MenuItem value={typeName} key={typeName}>{typeName}</MenuItem>)}
        </Select>
      </div>
      <div className={classes.row}>
        <button
          type='button'
          onClick={onShowCustomClick}
          className={classes.customInput}
        >
          Velg egendefinert property
        </button>
        {showCustom &&
          <div>
            <h6>Skriv inn navn</h6>
            <TextField
              value={property.displayName}
              onChange={onChangeCustomProperty}
              fullWidth={true}
            />
          </div>
        }
      </div>
      <div>
        <button
          type='button' onClick={onConfirm}
          className={classes.closeButton}
        >Ferdig
        </button>
      </div>
    </Modal>
  );
}

export default AddPropertyModal;
