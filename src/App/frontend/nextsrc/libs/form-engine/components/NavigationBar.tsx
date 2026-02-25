import React from 'react';

import cn from 'classnames';
import { useNavigate, useParams } from 'react-router';
import { useLayoutNames } from 'nextsrc/libs/form-client/react/hooks';

import classes from 'nextsrc/libs/form-engine/components/NavigationBar.module.css';

import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';

export const NavigationBar = (_props: ComponentProps) => {
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();
  const layoutNames = useLayoutNames();

  return (
    <nav>
      <ul className={classes.menu}>
        {layoutNames.map((name, index) => (
          <li
            key={name}
            className={classes.containerBase}
          >
            <button
              type='button'
              className={cn(classes.buttonBase, {
                [classes.buttonSelected]: name === pageId,
              })}
              onClick={() => navigate(`../${name}`, { relative: 'path' })}
              {...(name === pageId && { 'aria-current': 'page' as const })}
            >
              {index + 1}. {name}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};
