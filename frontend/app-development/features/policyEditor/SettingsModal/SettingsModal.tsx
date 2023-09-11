import React, { useState } from 'react';
import classes from './SettingsModal.module.css';
import ReactModal from 'react-modal';
import { Button, Heading } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { CogIcon } from '@navikt/aksel-icons';

const modalStyles = {
  content: {
    width: '70%',
    height: '70%',
    borderRadius: '20px',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    padding: 0,
    paddingTop: '20px',
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
};

export const SettingsModal = () => {
  const { t } = useTranslation();

  const [isOpen, setIsOpen] = useState(true);

  return (
    <>
      {/* TODO - Move button to the correct place to open the modal from. Issue: #11047 */}
      <Button onClick={() => setIsOpen(true)}>Åpne modal</Button>
      <ReactModal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        contentLabel='Innstillinger'
        ariaHideApp={false}
        style={modalStyles}
      >
        <div className={classes.headingWrapper}>
          <CogIcon fontSize='2rem' />
          <Heading level={2} size='small'>
            {t('settings_modal.heading')}
          </Heading>
        </div>
        {/* TODO - Add content. Issue: #11044 */}
      </ReactModal>
    </>
  );
};
