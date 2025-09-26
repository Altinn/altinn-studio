import React, { forwardRef, type ReactElement, type Ref } from 'react';
import { StudioTextfield } from '../StudioTextfield';
import classes from './StudioIconViewer.module.css';
import { StudioParagraph } from '../StudioParagraph';
import * as StudioIcons from '@studio/icons';

const icons = Object.keys(StudioIcons);

function StudioIconViewer(_props: {}, ref: Ref<HTMLDivElement>): ReactElement {
  const [search, setSearch] = React.useState<string>('');

  const searchedIcons = icons.filter((iconName) =>
    iconName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className={classes.rootContainer} ref={ref}>
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
              <StudioParagraph>{iconName}</StudioParagraph>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ForwardedStudioIconViewer = forwardRef(StudioIconViewer);

export { ForwardedStudioIconViewer as StudioIconViewer };
