import * as React from 'react';

export interface IRedirectComponentProvidedProps {
  redirectUrl: string;
  classes: any;
}

export class RedirectComponent extends
  React.Component<IRedirectComponentProvidedProps, any> {

  public render() {
    const altinnWindow: any = window;
    const { org, service } = altinnWindow;
    // tslint:disable-next-line:max-line-length
    window.location.assign(`${altinnWindow.location.origin}/${this.props.redirectUrl}?ReturnUrl=%2Fruntime%2F${org}%2F${service}%2FManualTesting`);
    // tslint:disable-next-line:jsx-self-close
    return (<React.Fragment />);
  }
}

export default RedirectComponent;
