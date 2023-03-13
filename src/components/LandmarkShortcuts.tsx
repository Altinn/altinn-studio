import React from 'react';

import { makeStyles } from '@material-ui/core';
import cn from 'classnames';

export interface ILandmarkShortcutsProps {
  shortcuts: ILandmarkShortcut[];
}

interface ILandmarkShortcut {
  id: string;
  text: string;
}

const useStyles = makeStyles({
  button: {
    textDecoration: 'underline',
    textAlign: 'left',
    padding: '5px',
    paddingLeft: '10px',
  },
  srOnly: {
    position: 'absolute',
    clip: 'rect(0,0,0,0)',
    border: 0,
    '&:focus': {
      position: 'relative',
      width: 'auto',
      height: 'auto',
    },
  },
});

export function LandmarkShortcuts({ shortcuts }: ILandmarkShortcutsProps) {
  const classes = useStyles();

  const handleClick = (id: string) => {
    // workaround because we still use a hash-router (sigh...)
    // can be replaced by the more elegant solution <a href="#main-content></a> once this is no longer the case.
    const target = document.getElementById(id);
    if (target) {
      const currentTabIndex = target.tabIndex;
      target.tabIndex = -1;
      target.focus();
      target.tabIndex = currentTabIndex;
    }
  };

  return (
    <nav>
      {shortcuts.map((shortcut) => {
        return (
          <button
            key={shortcut.id}
            role='link'
            className={cn(classes.button, classes.srOnly)}
            onClick={() => handleClick(shortcut.id)}
          >
            {shortcut.text}
          </button>
        );
      })}
    </nav>
  );
}
