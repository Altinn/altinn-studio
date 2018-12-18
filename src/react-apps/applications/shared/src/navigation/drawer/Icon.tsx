import * as React from 'react';
import InformationIcon from '@material-ui/icons/Info';
import SettingsIcon from '@material-ui/icons/Settings';

export interface IIconProps {
  iconType: any;
}

export default class Icon extends React.Component<IIconProps, any> {

  components: any = {
    information: InformationIcon,
    settings: SettingsIcon,
  }
  public render() {
    const TagName = this.components[this.props.iconType || 'information'];
    return <TagName />;
  }
}
