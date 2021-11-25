import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { useAppSelector } from 'common/hooks';

type ConfirmationDialogRawProps = {
  // id: string;
  // keepMounted: boolean;
  // value: string;
  // open: boolean;
  onClose: (value?: string) => void;
};

export const CloneDialog = (props: ConfirmationDialogRawProps) => {
  const { onClose, ...other } = props;
  const language = useAppSelector((state) => state.language.language);
  const [name, setName] = React.useState('');
  // const [value, setValue] = React.useState(valueProp);
  // const radioGroupRef = React.useRef<HTMLElement>(null);

  // React.useEffect(() => {
  //   if (!open) {
  //     setValue(valueProp);
  //   }
  // }, [valueProp, open]);

  // const handleEntering = () => {
  //   if (radioGroupRef.current != null) {
  //     radioGroupRef.current.focus();
  //   }
  // };

  const handleCancel = () => {
    onClose();
  };

  const handleOk = () => {
    onClose();
  };

  // const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  //   setValue((event.target as HTMLInputElement).value);
  // };

  const handleChangeName = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };

  return (
    <Dialog
      sx={{ '& .MuiDialog-paper': { width: '80%', maxHeight: 435 } }}
      maxWidth='xs'
      // TransitionProps={{ onEntering: handleEntering }}
      open={true}
      {...other}
    >
      <DialogTitle>
        {getLanguageFromKey('dashboard.copy_application', language)}
      </DialogTitle>
      <DialogContent>
        {getLanguageFromKey('dashboard.copy_application_description', language)}
        <TextField
          id='outlined-basic'
          label='Outlined'
          variant='outlined'
          value={name}
          onChange={handleChangeName}
        />
      </DialogContent>
      <DialogActions>
        <Button autoFocus onClick={handleCancel}>
          Avbryt
        </Button>
        <Button onClick={handleOk}>Lag kopi</Button>
      </DialogActions>
    </Dialog>
  );
};
