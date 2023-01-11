import React from 'react';
import classes from './LandingPage.module.css';
import { PreviewContext } from '../PreviewContext';
import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import { useParams } from 'react-router-dom';
import { stringify } from 'qs';

export const LandingPage = () => {
  const { org, app } = useParams();
  let componentCounter = 0;
  const simulateAddingNewComponent = () => {
    // @ts-ignore
    document.getElementById('app-frontend-react-iframe').contentWindow.postMessage({
      type: 'add-new-component',
      component: {
        id: `my-component${componentCounter}`,
        type: 'Input',
        textResourceBinding: {
          title: `Demokomponent ${componentCounter}`,
        },
        dataModelBindings: {},
        required: true,
        readOnly: false,
      },
    });
    componentCounter++;
  };
  return (
    <PreviewContext>
      <div className={classes.header}>
        <h1>Preview from Hackaton</h1>
        <Button
          onClick={simulateAddingNewComponent}
          variant={ButtonVariant.Outline}
          color={ButtonColor.Secondary}
        >
          Simulate adding a new component
        </Button>
      </div>
      <iframe
        title='App in preview'
        id='app-frontend-react-iframe'
        src={`/designer/html/preview.html?${stringify({ org, app })}`}
        className={classes.iframe}
      ></iframe>
    </PreviewContext>
  );
};
