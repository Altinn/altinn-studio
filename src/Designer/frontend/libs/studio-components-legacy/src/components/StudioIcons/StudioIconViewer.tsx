import React from 'react';
import { StudioTextfield } from '../StudioTextfield';
import { Paragraph } from '@digdir/designsystemet-react';
import * as StudioIcons from '@studio/icons';

import classes from './StudioIconViewer.module.css';

/**
 * @deprecated Use StudioIconViewer from @studio/components instead.
 */
const icons = Object.keys(StudioIcons);

export const StudioIconViewer = (): React.ReactElement => {
  const [search, setSearch] = React.useState<string>('');

  const searchedIcons = icons.filter((iconName) =>
    iconName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className={classes.rootContainer}>
      <StudioTextfield
        label='Icon search'
        className={classes.searchField}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
      />
      <div className={classes.iconListContainer}>
        {searchedIcons.map((iconName) => {
          const IconComponent = StudioIcons[iconName];
          return (
            <div key={iconName} className={classes.iconCard}>
              <IconComponent className={classes.icon} />
              <Paragraph>{iconName}</Paragraph>
            </div>
          );
        })}
      </div>
    </div>
  );
};
