import * as React from 'react';
import {
  withStyles,
  MenuProps,
  Menu,
  ListItemText,
  MenuItem,
} from '@material-ui/core';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { IRepository } from 'app-shared/types';
import MakeCopyModal from '../makeCopy/MakeCopyModal';
import { PopoverOrigin } from '@material-ui/core/Popover';
import { useAppSelector } from 'common/hooks';

export interface IServiceMenuProps {
  anchorEl: HTMLElement;
  open: boolean;
  onClose: (event: React.SyntheticEvent) => void;
  service: IRepository;
}

const anchorOrigin: PopoverOrigin = {
  vertical: 'bottom',
  horizontal: 'center',
};

const transformOrigin: PopoverOrigin = {
  vertical: 'top',
  horizontal: 'center',
};

function ServiceMenu(props: IServiceMenuProps) {
  const { anchorEl, open, onClose, service } = props;
  const language = useAppSelector((state) => state.language.language);
  const [copyModalAnchor, setCopyModalAnchor] =
    React.useState<null | HTMLElement>(null);

  const openRepository = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    window.location.href = service.html_url;
  };

  const openDesigner = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    window.open(
      `${window.location.origin}/designer/${service.full_name}`,
      '_blank',
    );
  };

  const makeCopy = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setCopyModalAnchor(event.currentTarget);
  };

  const handleCloseCopyModal = (event?: React.MouseEvent<HTMLElement>) => {
    event?.stopPropagation();
    setCopyModalAnchor(null);
  };

  return (
    <>
      <StyledMenu
        id='service-menu'
        anchorEl={anchorEl}
        open={open}
        onClose={onClose}
      >
        <MenuItem id='repository-menu-button' onClick={openRepository}>
          <ListItemText>
            {getLanguageFromKey('dashboard.open_repository', language)}
          </ListItemText>
        </MenuItem>
        <MenuItem id='new-tab-menu-button' onClick={openDesigner}>
          <ListItemText>
            {getLanguageFromKey('dashboard.open_new_tab', language)}
          </ListItemText>
        </MenuItem>
        {!service.full_name.endsWith('-datamodels') && (
          <MenuItem id='make-copy-menu-button' onClick={makeCopy}>
            <ListItemText>
              {getLanguageFromKey('dashboard.make_copy', language)}
            </ListItemText>
          </MenuItem>
        )}
      </StyledMenu>
      <MakeCopyModal
        anchorEl={copyModalAnchor}
        handleClose={handleCloseCopyModal}
        service={service}
      />
    </>
  );
}

const StyledMenu = withStyles({
  paper: {
    border: '1px solid #d3d4d5',
  },
})((props: MenuProps) => (
  <Menu
    elevation={0}
    getContentAnchorEl={null}
    anchorOrigin={anchorOrigin}
    transformOrigin={transformOrigin}
    {...props}
  />
));

export default ServiceMenu;
