import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, HelpText } from '@digdir/design-system-react';
import { QuestionmarkDiamondIcon, TrashIcon } from '@studio/icons';

import classes from './UnknownReferencedItem.module.css';

type UnknownReferencedItemProps = {
  id: string;
};
export const UnknownReferencedItem = ({ id }: UnknownReferencedItemProps) => {
  const { t } = useTranslation();

  return (
    <div className={classes.unknownReferencedItem}>
      <div className={classes.title}>
        <QuestionmarkDiamondIcon />
        {id}
      </div>
      <div className={classes.title}>
        <Button
          color='danger'
          icon={<TrashIcon />}
          // onClick={handleDelete}
          size='small'
          title={t('general.delete')}
          variant='tertiary'
        />
        <HelpText size='small' title='Ukjent komponent' className={classes.helpText}>
          Referansen med ID {id} er ugyldig, da det ikke eksisterer noen komponent med denne ID-en.
          Vennligst slett denne referansen for å rette feilen.
        </HelpText>
      </div>
    </div>
  );
};
