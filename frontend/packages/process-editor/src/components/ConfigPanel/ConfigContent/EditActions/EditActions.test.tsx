import React from 'react';
import { render, screen } from '@testing-library/react';
import { EditActions } from './EditActions';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';
import {mockBpmnDetails} from "../../../../../test/mocks/bpmnDetailsMock";
import {mockModelerRef} from "../../../../../test/mocks/bpmnModelerMock";
import {useBpmnContext} from "../../../../contexts/BpmnContext";
import {BpmnDetails} from "../../../../types/BpmnDetails";

const setBpmnDetailsMock = jest.fn();
jest.mock('../../../../contexts/BpmnContext', () => ({
    useBpmnContext: () => ({
        modelerRef: mockModelerRef,
        setBpmnDetails: setBpmnDetailsMock,
        bpmnDetails: mockBpmnDetails,
    }),
}));

const overRideSetBpmnDetailsMock = (bpmnDetails: BpmnDetails) => {
    (useBpmnContext as jest.Mock).mockReturnValue({
                    modelerRef: mockModelerRef,
                    setBpmnDetails: setBpmnDetailsMock,
                    bpmnDetails: bpmnDetails,
                })
};

describe('EditActions', () => {
    it('should render only "add new action" button when task have no actions', () => {
        overRideSetBpmnDetailsMock({...mockBpmnDetails, element: null})
        renderEditActions();
        const addNewActionButton = screen.getAllByRole('button', {
                name: textMock('process_editor.configuration_panel_actions_add_new'),
            });
        expect(addNewActionButton).toHaveLength(1);
    });

    it('should render existing actions when task has a predefined actions', () => {
        const action1Name = mockBpmnDetails.element.businessObject.extensionElements.values[0].actions.action[0].action;
        const action2Name = mockBpmnDetails.element.businessObject.extensionElements.values[0].actions.action[1].action;
        renderEditActions();
        screen.getByDisplayValue(action1Name);
        screen.getByDisplayValue(action2Name);
        screen.getByRole('checkbox', {name: `set_server_type_for_${action2Name}_action`})
    });

    it('should render checkbox that is checked for a task that has a predefined serverAction', () => {
        const serverAction = mockBpmnDetails.element.businessObject.extensionElements.values[0].actions.action[1].action;
        renderEditActions();
        const serverActionCheckBox = screen.getByRole('checkbox', {name: `set_server_type_for_${serverAction}_action`});
        expect(serverActionCheckBox).toBeInTheDocument();
        expect(serverActionCheckBox).toBeChecked();
    });
});


const renderEditActions = () => {
    return render(
            <EditActions />
    );
}
