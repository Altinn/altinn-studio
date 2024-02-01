import React, { useState } from 'react';
import classes from './EditableTextField.module.css';
import cn from 'classnames';
import { Textfield, Divider, Heading, HelpText, Paragraph } from '@digdir/design-system-react';
import { KeyVerticalIcon, PencilIcon } from '@studio/icons';

type EditableTextFieldProps = {
  value: string;
  onChange: (value: string) => void;
  onLeaveTextField: () => void;
  //label: string;
};

export const EditableTextField = ({
  value,
  onChange,
  onLeaveTextField,
}: EditableTextFieldProps): React.JSX.Element => {
  const [isActive, setIsActive] = useState<boolean>(false);

  const handleLeaveTextField = () => {
    onLeaveTextField();
    setIsActive(false);
  };

  // Find out how to handle error
  return (
    <div className={classes.wrapper}>
      <div className={classes.iconAndIdWrapper}>
        <KeyVerticalIcon />
        <Paragraph size='xsmall'>ID:</Paragraph>
      </div>
      {isActive ? (
        <Textfield
          size='small'
          value={value}
          className={classes.textField}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleLeaveTextField}
          onMouseLeave={handleLeaveTextField}
        />
      ) : (
        <button className={classes.valueWrapper} onClick={() => setIsActive(true)}>
          <Paragraph size='xsmall'>{value}</Paragraph>
          <PencilIcon className={classes.pencilIcon} />
        </button>
      )}
    </div>
  );
};
