import React from 'react';
import classes from './PolicyEditorStartPage.module.css';
import { Button } from '@digdir/design-system-react';
import { useNavigate } from 'react-router-dom';
import {
  resourceIdMock1,
  resourceIdMock3,
  resourceTypeMock1,
  resourceTypeMock3,
} from 'resourceadm/data-mocks/policies';

/**
 * Dummy component to display buttons where the user can click to view either
 * the create new policy or edit policy functionality
 */
export const PolicyEditorStartPage = () => {
  const navigate = useNavigate();
  return (
    <div className={classes.wrapper}>
      <div className={classes.contentWrapper}>
        <h2>Hva vil du gjøre?</h2>
        <div className={classes.buttonWrapper}>
          <Button
            type='button'
            onClick={() => {
              navigate('/policyEditor', {
                state: {
                  resourceId: resourceIdMock3,
                  resourceType: resourceTypeMock3,
                },
              });
            }}
          >
            Lag ny policy
          </Button>
          <Button
            type='button'
            onClick={() => {
              navigate('/policyEditor', {
                state: {
                  resourceId: resourceIdMock1,
                  resourceType: resourceTypeMock1,
                },
              });
            }}
          >
            Endre policy
          </Button>
          <p>
            Valgt policy: <strong>policy1</strong>
          </p>
        </div>
      </div>
    </div>
  );
};
