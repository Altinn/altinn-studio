import * as React from 'react';
import { connect } from 'react-redux';
import ThirdPartyComponentsActionDispatcher from './actions/thirdPartyComponentsActions/thirdPartyComponentsActionDispatcher';

export interface IUglyTestProps {
  components: any;
}

export interface IUglyTestState {

}

export class UglyTestComponent extends React.Component<IUglyTestProps, IUglyTestState> {
  componentDidMount() {
    ThirdPartyComponentsActionDispatcher.fetchThirdPartyComponents(
      "http://altinn3.no/Jesper/ThirdPartyComponents/raw/branch/master/dist/index.js",
      ["Button", "ThisNewAwesomeNewComponentThatWillBlowYourMind"],
    );
  }

  render(): JSX.Element {
    const { components } = this.props;
    if (!components) {
      return (
        <div>
          No components
        </div>
      );
    }
    console.log(components);
    return (
      <div>
        {Object.keys(components).map((component) => (
          <>{components[component]}</>
        ))}
      </div>
    )
  }
}

const mapStateToProps = (state: IAppState, empty: any): IUglyTestProps => ({
  components: state.thirdPartyComponents.components,
});

export const UglyTest = connect(mapStateToProps)(UglyTestComponent);