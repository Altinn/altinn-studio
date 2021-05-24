/* eslint-disable react/no-unused-state */
import * as React from 'react';
import { connect } from 'react-redux';
import Select from 'react-select';

export interface ISelectDataModelProps extends IProvidedProps {
  dataModelElements: IDataModelFieldElement[];
}

export interface IProvidedProps {
  selectedElement: string;
  onDataModelChange: (dataModelField: string) => void;
  noOptionsMessage?: () => string;
  hideRestrictions?: boolean;
  language: any;
  selectGroup?: boolean;
}

export interface ISelectDataModelState {
  selectedElement: string;
}

const selectStyles = {
  control: (base: any) => ({
    ...base,
    borderRadius: '0 !important',
  }),
};

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
    this.setState({ selectedElement: e.value });
    this.props.onDataModelChange(e.value);
  }

  public getRestrictions(selectedId: string): any {
    if (!selectedId) {
      return (
        <li className='a-dotted'>
          <div className='row'>
            <div className='col-12'>
              {this.props.language.ux_editor.modal_restrictions_helper}
            </div>
          </div>
        </li>
      );
    }
    const selected = this.props.dataModelElements.find(
      (modelBinding) => modelBinding.dataBindingName === selectedId,
    );
    return (
      Object.keys(selected.restrictions).length === 0 ? (
        <li className='a-dotted'>
          <div className='row'>
            <div className='col-12'>
              {this.props.language.ux_editor.modal_restrictions_empty}
            </div>
          </div>
        </li>)
        :
        Object.keys(selected.restrictions).map(
          (key: string): React.ReactNode => (
            <li key={key} className='a-dotted'>
              <div className='row'>
                <div className='col-4'>{key}</div>
                <div className='col-8'>{selected.restrictions[key].Value}</div>
              </div>
            </li>
          ),
        )
    );
  }

  public render() {
    const {
      dataModelElements,
      selectGroup,
      selectedElement,
      noOptionsMessage,
    } = this.props;
    const dataModelElementNames = dataModelElements.filter((element) => (element.dataBindingName &&
      ((!selectGroup && element.maxOccurs <= 1) || (selectGroup && element.maxOccurs > 1))))
      .map((element) => ({ value: element.dataBindingName, label: element.displayString }));
    return (
      <Select
        styles={selectStyles}
        options={dataModelElementNames}
        defaultValue={{ value: selectedElement, label: selectedElement }}
        onChange={this.onDataModelChange}
        noOptionsMessage={noOptionsMessage}
      />
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
    noOptionsMessage: props.noOptionsMessage,
    dataModelElements: state.appData.dataModel.model,
    language: state.appData.languageState.language,
  };
};

export const SelectDataModelComponent = connect(mapStateToProps)(
  SelectDataModel,
);
