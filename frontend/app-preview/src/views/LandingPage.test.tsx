import React from 'react';
import { screen, queryByAttribute } from '@testing-library/react';
import { LandingPage } from './LandingPage';
import { renderWithMockStore } from '../../../../frontend/packages/ux-editor/src/testing/mocks';
import {textMock} from "../../../testing/mocks/i18nMock";

describe('LandingPage', () => {
    
    it('should render an iframe', () => {
        const { renderResult } = renderWithMockStore()(<LandingPage variant={'preview'} />)

        const getById = queryByAttribute.bind(null, 'id');
        
        const iframe = getById(renderResult.container, 'app-frontend-react-iframe');
        expect(iframe).toBeInTheDocument();
    });

    it('should render the information alert with preview being limited', () => {
        renderWithMockStore()(<LandingPage variant={'preview'} />)

        const previewLimitationsAlert = screen.getByText(textMock('preview.limitations_info'));
        expect(previewLimitationsAlert).toBeInTheDocument();
    });
});