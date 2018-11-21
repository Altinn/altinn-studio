import * as React from 'react';
import { connect } from 'react-redux';
import * as uuid from 'uuid/v1'; // time
import { SelectDataModelComponent } from './SelectDataModelComponent';

export interface IRuleComponentProps {
  connectionId?: any;
  cancelEdit: () => void;
  saveEdit: (updatedConnection: any) => void;
  ruleModelElements: IRuleModelFieldElement[];
  dataModelElements: IDataModelFieldElement;
  ruleConnection: any;
  deleteConnection?: (connectionId: any) => void;
}

class Rule extends React.Component<IRuleComponentProps, any> {
  constructor(_props: IRuleComponentProps, _state: any) {
    super(_props, _state);
    this.state = {
      selectedFunctionNr: null,
      connectionId: null,
      ruleConnection: {
        selectedFunction: '',
        inputParams: '',
        outParams: '',
      },
    };
  }

  public componentDidMount() {
    if (this.props.connectionId) {
      for (let i = 0; this.props.ruleModelElements.length - 1; i++) {
        if (this.props.ruleModelElements[i].name === this.props.ruleConnection[this.props.connectionId].selectedFunction) {
          this.setState({
            selectedFunctionNr: i,
          });
          break;
        }
      }
      this.setState({
        connectionId: this.props.connectionId,
        ruleConnection: {
          ...this.props.ruleConnection[this.props.connectionId],
        },
      });
    } else {
      this.setState({ connectionId: uuid() });
    }
  }

  public handleSaveEdit = (): void => {
    const connectionToSave = {
      [this.state.connectionId]: {
        ...this.state.ruleConnection,
      },
    };
    this.props.saveEdit(connectionToSave);
  }

  public handleSelectedMethodChange = (e: any): void => {
    const nr = e.target.selectedIndex - 1 < 0 ? null : e.target.selectedIndex - 1;

    const value = e.target.value;
    this.setState({
      selectedFunctionNr: nr,
      ruleConnection: {
        ...this.state.ruleConnection,
        selectedFunction: value,
      },
    });
  }

  public handleParamDataChange = (paramName: any, e: any): void => {
    const value = e.target.value;
    this.setState({
      ruleConnection: {
        ...this.state.ruleConnection,
        inputParams: {
          ...this.state.ruleConnection.inputParams,
          [paramName]: value,
        },
      },
    });
  }

  public handleOutParamDataChange = (paramName: any, e: any): void => {
    const value = e.target.value;
    this.setState({
      ruleConnection: {
        ...this.state.ruleConnection,
        outParams: {
          ...this.state.ruleConnection.outParams,
          [paramName]: value,
        },
      },
    });
  }

  public handleDeleteConnection = () => {
    this.props.deleteConnection(this.props.connectionId);
  }

  public render(): JSX.Element {
    const selectedMethod = this.state.ruleConnection.selectedFunction;
    const selectedMethodNr = this.state.selectedFunctionNr;
    return (
      <div className='modal-content'>
        <div className='modal-header a-modal-header'>
          <div className='a-iconText a-iconText-background a-iconText-large'>
            <div className='a-iconText-icon'>
              <i className='ai ai-corp a-icon' />
            </div>
            <h1 className='a-iconText-text mb-0'>
              <span className='a-iconText-text-large'>Configure rules</span>
            </h1>
          </div>
        </div>
        <div className='modal-body a-modal-body'>
          <div className='form-group a-form-group'>
            <label htmlFor='selectRule' className='a-form-label'>Rule</label>
            <select
              name='selectRule'
              onChange={this.handleSelectedMethodChange}
              value={selectedMethod}
              className='custom-select a-custom-select'
            >
              <option value={''}>{'Velg metode:'}</option>
              {this.props.ruleModelElements.map((funcObj: any, i: any) => {
                return (
                  <option key={funcObj.name} value={funcObj.name}>{funcObj.name}</option>
                );
              })}
            </select>
          </div>
          {this.state.ruleConnection.selectedFunction ?
            <>
              <div className='form-group a-form-group mt-2'>
                <h2 className='a-h4'>Configure input parameters</h2>
                {Object.keys(this.props.ruleModelElements[selectedMethodNr].inputs).map(
                  (key: any, index: any) => {
                    const paramName = key;
                    return (
                      <div className='align-items-center mb-1 row' key={index}>
                        <div className='col-3 col'>
                          <div className='form-group a-form-group mt-1 disabled'>
                            <label className='a-form-label' htmlFor={paramName}>
                              Input param name
                            </label>
                            <input
                              id={paramName}
                              name={paramName}
                              type='text'
                              className='form-control'
                              value={this.props.ruleModelElements[selectedMethodNr].inputs[key]}
                              width={10}
                              disabled={true}
                            />
                          </div>
                        </div>
                        <div className='col-9 col'>
                          <SelectDataModelComponent
                            onDataModelChange={this.handleParamDataChange.bind(null, paramName)}
                            selectedElement={this.state.ruleConnection.inputParams[paramName]}
                            hideRestrictions={true}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
              <div className='form-group a-form-group mt-2'>
                <h2 className='a-h4'>Configure output parameters</h2>
                {/* length is always 1 since method always returns just one thing */}
                <div className='align-items-center mt-1 row' key='0'>
                  <div className='col col-3'>
                    <div className='form-group a-form-group mt-1 disabled'>
                      <label className='a-form-label' htmlFor='outParam'>
                        Out param name
                      </label>
                      <input
                        id='outParam0'
                        name='outParam0'
                        type='text'
                        className='form-control'
                        value='outParam0'
                        width={10}
                        disabled={true}
                      />
                    </div>
                  </div>
                  <div className='col col-9'>
                    <SelectDataModelComponent
                      onDataModelChange={this.handleOutParamDataChange.bind(null, 'outParam0')}
                      selectedElement={this.state.ruleConnection.outParams.outParam0}
                      hideRestrictions={true}
                    />
                  </div>
                </div>
              </div>
            </>
            :
            null}
          <div className='row mt-3'>
            <div className='col'>
              {this.state.ruleConnection.selectedFunction ?
                <button onClick={this.handleSaveEdit} type='submit' className='a-btn a-btn-success mr-2'>Save</button>
                :
                null
              }
              {this.props.connectionId ?
                <button type='button' className='a-btn a-btn-danger mr-2' onClick={this.handleDeleteConnection}>
                  Delete
                </button>
                : null
              }
              <a onClick={this.props.cancelEdit}>Cancel</a>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

const mapsStateToProps = (state: IAppState, props: any): any => {
  return {
    ruleModelElements: state.appData.ruleModel.model.filter((key: any) => key.type === 'rule'),
    dataModelElements: state.appData.dataModel.model,
    ruleConnection: state.serviceConfigurations.ruleConnection,
    selectedFunction: props.selectedFunction,
  };
};

export const RuleComponent = connect(mapsStateToProps)(Rule);
