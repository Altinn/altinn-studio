// import React from 'react';
// import type { AppDeploymentProps } from './AppDeployment';
// import { AppDeployment } from './AppDeployment';
// import { act, screen } from '@testing-library/react';
// import userEvent from '@testing-library/user-event';
// import { renderWithMockStore } from 'app-development/test/mocks';
// import { textMock } from '../../../../testing/mocks/i18nMock';
// import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
// import type { ImageOption } from './ImageOption';
// import type { PipelineDeployment } from 'app-shared/types/api/PipelineDeployment';

// const render = (props?: Partial<AppDeploymentProps>, queries?: Partial<ServicesContextProps>) => {
//   const defaultProps: AppDeploymentProps = {
//     deployHistory: [],
//     deployPermission: true,
//     envName: 'test',
//     imageOptions: [],
//     orgName: 'test',
//     showLinkToApp: true,
//   };
//   const merged = { ...defaultProps, ...props };

//   return renderWithMockStore({}, queries)(<AppDeployment {...merged} />);
// };
// describe('AppDeploymentComponent', () => {
//   const user = userEvent.setup();
//   it('should render', () => {
//     render();
//     expect(
//       screen.getByText(`${textMock('app_deployment.environment', { envName: 'test' })}`),
//     ).toBeInTheDocument();
//   });

//   it('should render with no deploy history', () => {
//     render();
//     expect(
//       screen.getByText(textMock('app_deployment.kubernetes_deployment.status.none')),
//     ).toBeInTheDocument();
//     expect(
//       screen.getByText(
//         textMock('app_deployment.table.deployed_version_history_empty', { envName: 'test' }),
//       ),
//     ).toBeInTheDocument();
//   });

//   it('should render missing rights message if deployPermission is false', () => {
//     render({ deployPermission: false });
//     expect(
//       screen.getByText(
//         textMock('app_deployment.missing_rights', { envName: 'test', orgName: 'test' }),
//       ),
//     ).toBeInTheDocument();
//   });

//   it('should render with deploy history', () => {
//     const deployHistory: PipelineDeployment[] = [
//       {
//         app: 'test-app',
//         created: new Date().toDateString(),
//         createdBy: 'test-user',
//         envName: 'test',
//         id: 'test-id',
//         org: 'test-org',
//         tagName: 'test',
//         build: {
//           id: 'test-id',
//           finished: new Date().toDateString(),
//           result: 'succeeded',
//           status: 'Completed',
//           started: new Date().toDateString(),
//         },
//         deployedInEnv: true,
//         status: null,
//       },
//     ];
//     render({ deployHistory });
//     expect(
//       screen.getByText(
//         textMock('app_deployment.kubernetes_deployment.status.failed', {
//           appDeployedVersion: 'test',
//         }),
//       ),
//     ).toBeInTheDocument();
//     expect(
//       screen.getByText(
//         textMock('app_deployment.table.deployed_version_history', { envName: 'test' }),
//       ),
//     ).toBeInTheDocument();
//     expect(screen.getByText('test')).toBeInTheDocument();
//   });

//   it('should render error message if latest deploy failed', async () => {
//     const date = new Date().toDateString();
//     const deployHistory: PipelineDeployment[] = [
//       {
//         app: 'test-app',
//         created: date,
//         createdBy: 'test-user',
//         envName: 'testEnv',
//         id: 'test-id',
//         org: 'test-org',
//         tagName: 'testTag',
//         build: {
//           id: 'test-id',
//           finished: date,
//           result: 'failed',
//           status: 'failed',
//           started: date,
//         },
//         deployedInEnv: false,
//         status: null,
//         : null,
//       },
//     ];
//     render({ deployHistory });
//     expect(
//       await screen.findByText(
//         textMock('app_deployment.messages.failed', {
//           envName: 'testEnv',
//           tagName: 'testTag',
//           time: date,
//         }),
//       ),
//     ).toBeInTheDocument();
//   });

//   it('should should render error message if latest deploy succeeded but app is not reachable', () => {
//     const deployHistory: PipelineDeployment[] = [
//       {
//         app: 'test-app',
//         created: new Date().toDateString(),
//         createdBy: 'test-user',
//         envName: 'test',
//         id: 'test-id',
//         org: 'test-org',
//         tagName: 'test',
//         build: {
//           id: 'test-id',
//           finished: new Date().toDateString(),
//           result: 'succeeded',
//           status: 'Completed',
//           started: new Date().toDateString(),
//         },
//         deployedInEnv: false,
//         status: null,
//       },
//     ];
//     render({ deployHistory });
//     expect(
//       screen.getByText(textMock('app_deployment.deployed_version_unavailable')),
//     ).toBeInTheDocument();
//   });

//   it('should should render warning message if latest deploy has status failed but app is reachable', () => {
//     const deployHistory: PipelineDeployment[] = [
//       {
//         app: 'test-app',
//         created: new Date().toDateString(),
//         createdBy: 'test-user',
//         envName: 'testEnv',
//         id: 'test-id',
//         org: 'test-org',
//         tagName: 'testTag',
//         build: {
//           id: 'test-id',
//           finished: new Date().toDateString(),
//           result: 'failed',
//           status: 'Completed',
//           started: new Date().toDateString(),
//         },
//         deployedInEnv: true,
//         status: null,
//       },
//     ];
//     render({ deployHistory });
//     expect(
//       screen.getByText(
//         textMock('app_publish.deployment_in_env.status_missing', {
//           envName: 'testEnv',
//           tagName: 'testTag',
//         }),
//       ),
//     ).toBeInTheDocument();
//   });

//   it('should handle build.finished as null when latest deploy has status failed but app is reachable', () => {
//     const deployHistory: PipelineDeployment[] = [
//       {
//         app: 'test-app',
//         created: new Date().toDateString(),
//         createdBy: 'test-user',
//         envName: 'testEnv',
//         id: 'test-id',
//         org: 'test-org',
//         tagName: 'testTag',
//         build: {
//           id: 'test-id',
//           finished: null,
//           result: 'failed',
//           status: 'Completed',
//           started: new Date().toDateString(),
//         },
//         deployedInEnv: true,
//         status: null,
//       },
//     ];
//     render({ deployHistory });
//     expect(
//       screen.getByText(
//         textMock('app_publish.deployment_in_env.status_missing', {
//           envName: 'testEnv',
//           tagName: 'testTag',
//         }),
//       ),
//     ).toBeInTheDocument();
//   });

//   it('should render deploy dropdown with image options', async () => {
//     const imageOptions: ImageOption[] = [
//       {
//         label: 'test1',
//         value: 'test1',
//       },
//       {
//         label: 'test2',
//         value: 'test2',
//       },
//     ];
//     render({ imageOptions });
//     expect(
//       screen.getByText(textMock('app_deployment.messages.choose_version')),
//     ).toBeInTheDocument();
//     const dropdown = screen.getByRole('combobox');
//     expect(dropdown).toBeInTheDocument();
//     await act(() => user.click(dropdown));
//     expect(screen.getAllByRole('option')).toHaveLength(2);
//   });

//   it('should render spinner when deployment is in progress', () => {
//     const deployHistory: PipelineDeployment[] = [
//       {
//         app: 'test-app',
//         created: new Date().toDateString(),
//         createdBy: 'test-user',
//         envName: 'test',
//         id: 'test-id',
//         org: 'test-org',
//         tagName: 'test',
//         build: {
//           id: 'test-id',
//           finished: null,
//           result: 'inProgress',
//           status: 'inProgress',
//           started: new Date().toDateString(),
//         },
//         deployedInEnv: false,
//         status: null,
//       },
//     ];
//     render({ deployHistory });
//     expect(
//       screen.getByText(textMock('app_deployment.pipeline_deployment.build_result.none')),
//     ).toBeInTheDocument();
//   });

//   it('should render error message if call to deployment endpoint fails', async () => {
//     const imageOptions: ImageOption[] = [
//       {
//         label: 'test1',
//         value: 'test1',
//       },
//       {
//         label: 'test2',
//         value: 'test2',
//       },
//     ];
//     const queries: Partial<ServicesContextProps> = {
//       createDeployment: jest.fn().mockRejectedValue(new Error('test error')),
//     };
//     render({ imageOptions }, queries);
//     expect(
//       screen.getByText(textMock('app_deployment.messages.choose_version')),
//     ).toBeInTheDocument();
//     const dropdown = screen.getByRole('combobox');
//     expect(dropdown).toBeInTheDocument();
//     await act(() => user.click(dropdown));
//     await act(() => user.click(screen.getByText('test1')));
//     await act(() =>
//       user.click(
//         screen.getByRole('button', {
//           name: textMock('app_deployment.messages.btn_deploy_new_version'),
//         }),
//       ),
//     );
//     await act(() => user.click(screen.getByRole('button', { name: textMock('general.yes') })));
//     expect(
//       await screen.findByText(textMock('app_deployment.messages.technical_error_1')),
//     ).toBeInTheDocument();
//   });
// });
