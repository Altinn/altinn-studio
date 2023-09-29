import React from 'react';
import classes from './About.module.css';
import { useAppMetadataQuery } from 'app-development/hooks/queries';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { PageSpinner } from 'app-shared/components/PageSpinner';

export const About = () => {
  const { org, app } = useStudioUrlParams();
  const { data: metadata, isLoading } = useAppMetadataQuery(org, app);

  if (isLoading) return <PageSpinner />;

  return (
    <div className={classes.about}>
      <div className={classes.container}>
        <div>
          <h1 className={classes.header}>{metadata?.title?.nb}</h1>
        </div>
        <div className={classes.content}>
          <main className={classes.main}>
            <div className={classes.placeholder}>{/* APP STATUS PLACEHOLDER */}</div>
            <hr className={classes.divider} />
            <div className={classes.placeholder} style={{ height: '300px' }}>
              {/* NAVIGATION PLACEHOLDER */}
            </div>
          </main>
          <aside className={classes.aside}>
            <div className={classes.placeholder} style={{ height: '300px' }}>
              {/* DOCUMENTATION PLACEHOLDER */}
            </div>
            <hr className={classes.divider} />
            <div className={classes.placeholder}>{/* NEWS PLACEHOLDER */}</div>
          </aside>
        </div>
      </div>
    </div>
  );
};
