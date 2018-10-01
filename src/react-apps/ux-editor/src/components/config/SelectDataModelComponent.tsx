import * as React from 'react';
import { connect } from 'react-redux';

export interface ISelectDataModelProps extends IProvidedProps {
  dataModelElements: IDataModelFieldElement[];
}

export interface IProvidedProps {
  selectedElement: string;
  onDataModelChange: (dataModelField: string) => void;
  hideRestrictions?: boolean;
}

export interface ISelectDataModelState {
  selectedElement: string;
}

export class SelectDataModel extends React.Component<
  ISelectDataModelProps,
  ISelectDataModelState
  > {
  constructor(_props: ISelectDataModelProps, _state: ISelectDataModelState) {
    super(_props, _state);

    this.state = {
      selectedElement: _props.selectedElement,
    };

    this.onDataModelChange = this.onDataModelChange.bind(this);
  }

  public onDataModelChange(e: any) {
    this.setState({ selectedElement: e.target.value });
    this.props.onDataModelChange(e);
  }

  public getRestrictions(selectedId: string): any {
    if (!selectedId) {
      return (
        <li className='a-dotted'>
          <div className='row'>
            <div className='col-12'>Please select a field in the data model</div>
          </div>
        </li>
      );
    }
    const selected = this.props.dataModelElements.find(
      modelBinding => modelBinding.DataBindingName === selectedId);
    return (
      Object.keys(selected.Restrictions).length === 0 ? (
        <li className='a-dotted'>
          <div className='row'>
            <div className='col-12'>No restrictions to show</div>
          </div>
        </li>)
        :
        Object.keys(selected.Restrictions).map(
          (key: string): React.ReactNode => (
            <li key={key} className='a-dotted'>
              <div className='row'>
                <div className='col-4'>{key}</div>
                <div className='col-8'>{selected.Restrictions[key].Value}</div>
              </div>
            </li>
          ),
        )
    );
  }

  public render() {
    return (
      <div className='form-group a-form-group mt-1'>
        <label className='a-form-label' htmlFor='nameField'>Select field in data model:</label>
        <div className='a-form-group-items input-group'>
          <select
            name={'selectDataModel'}
            value={this.state.selectedElement}
            onChange={this.onDataModelChange}
            className='custom-select a-custom-select'
          >
            <option value={''}>{'Velg knytning:'}</option>
            {this.props.dataModelElements.map(element => {
              if (!element.DataBindingName || element.Type !== 'Field') {
                return null;
              }
              return (
                <option key={element.ID} value={element.DataBindingName}>
                  {element.ID}
                </option>
              );
            })}
          </select>
        </div>
        {this.props.hideRestrictions === true ? null : (
          <div className='a-list-container mt-2'>
            <ul className='a-list'>
              <li className='a-dotted' id='restrictions-firstRow'>
                <div className='row'>
                  <div className='col'>
                    <span className='a-fontBold'>
                      Restrictions from data model
                  </span>
                  </div>
                </div>
              </li>
              {this.getRestrictions(this.props.selectedElement)}
            </ul>
          </div>
        )}
      </div>
    );
  }
}

const mapStateToProps = (
  state: IAppState,
  props: IProvidedProps,
): ISelectDataModelProps => {
  return {
    selectedElement: props.selectedElement,
    onDataModelChange: props.onDataModelChange,
    dataModelElements: state.appData.dataModel.model,
  };
};

export const SelectDataModelComponent = connect(mapStateToProps)(
  SelectDataModel,
);
