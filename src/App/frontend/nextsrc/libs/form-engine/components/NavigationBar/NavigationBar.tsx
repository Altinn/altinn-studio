import React from 'react';

import cn from 'classnames';
import { useNavigate, useParams } from 'react-router';
import { usePageOrder, useTextResource } from 'nextsrc/libs/form-client/react/hooks';

import classes from 'nextsrc/libs/form-engine/components/NavigationBar/NavigationBar.module.css';

import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';

const NavButton = ({ name, index, isCurrent, onClick }: { name: string; index: number; isCurrent: boolean; onClick: () => void }) => {
  const label = useTextResource(name);

  return (
    <li className={classes.containerBase}>
      <button
        type='button'
        className={cn(classes.buttonBase, {
          [classes.buttonSelected]: isCurrent,
        })}
        onClick={onClick}
        {...(isCurrent && { 'aria-current': 'page' as const })}
      >
        {index + 1}. {label || name}
      </button>
    </li>
  );
};

export const NavigationBar = (_props: ComponentProps) => {
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();
  const pageOrder = usePageOrder();

  return (
    <nav data-testid='NavigationBar'>
      <ul id='navigation-menu' className={classes.menu}>
        {pageOrder.map((name, index) => (
          <NavButton
            key={name}
            name={name}
            index={index}
            isCurrent={name === pageId}
            onClick={() => navigate(`../${name}`, { relative: 'path' })}
          />
        ))}
      </ul>
    </nav>
  );
};
