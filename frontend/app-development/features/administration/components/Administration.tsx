import React from 'react';
import classes from './Administration.module.css';
import { useAppConfigQuery } from 'app-development/hooks/queries';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { PageSpinner } from 'app-shared/components/PageSpinner';

export const Administration = () => {
  const { org, app } = useStudioUrlParams();
  const { data: appConfigData, isLoading } = useAppConfigQuery(org, app);

  if (isLoading) return <PageSpinner />;

  return (
    <div className={classes.administration}>
      <div className={classes.container}>
        <h1 className={classes.header}>{appConfigData.serviceName}</h1>
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
