/* tslint:disable:object-literal-key-quotes */
import { SagaIterator } from 'redux-saga';
import { call, fork, takeLatest } from 'redux-saga/effects';
import { get } from '../../../../shared/src/utils/networking';
import * as DeployActions from './deployActions';
import * as DeployActionTypes from './deployActionTypes';
import DeployDispatchers from './deployDispatcher';

// const mockedDeploymentList = {
//   'kind': 'DeploymentList',
//   'apiVersion': 'apps/v1',
//   'metadata': {
//     'selfLink': '/apis/apps/v1/deployments',
//     'resourceVersion': '2369601',
//   },
//   'items': [
//     {
//       'metadata': {
//         'name': 'tdd-helloworld-example-repo',
//         'namespace': 'default',
//         'selfLink': '/apis/apps/v1/namespaces/default/deployments/tdd-helloworld-example-repo',
//         'uid': 'e121879f-470a-11e9-aad4-2a6bf3e3a8e2',
//         'resourceVersion': '15635',
//         'generation': 3,
//         'creationTimestamp': '2019-03-15T10:12:46Z',
//         'labels': {
//           'app': 'example-repo',
//           'chart': 'example-repo-1.0.0',
//           'heritage': 'Tiller',
//           'release': 'tdd-helloworld',
//         },
//         'annotations': {
//           'deployment.kubernetes.io/revision': '3',
//         },
//       },
//       'spec': {
//         'replicas': 1,
//         'selector': {
//           'matchLabels': {
//             'app': 'example-repo',
//             'release': 'tdd-helloworld',
//           },
//         },
//         'template': {
//           'metadata': {
//             // 'creationTimestamp': null,
//             'labels': {
//               'app': 'example-repo',
//               'release': 'tdd-helloworld',
//             },
//           },
//           'spec': {
//             'containers': [
//               {
//                 'name': 'example-repo',
//                 'image': 'tddregistry.azurecr.io/tdd-helloworld:513fe8ccdcce4909bc8cc0317f476fc3053f448c',
//                 'ports': [
//                   {
//                     'containerPort': 5005,
//                     'protocol': 'TCP',
//                   },
//                 ],
//                 'env': [
//                   {
//                     'name': 'GeneralSettings__RuntimeMode',
//                     'value': 'ServiceContainer',
//                   },
//                   {
//                     'name': 'ServiceRepositorySettings__BaseResourceFolderContainer',
//                     'value': '/AltinnService/',
//                   },
//                   {
//                     'name': 'ServiceRepositorySettings__RepositoryLocation',
//                     'value': '/AltinnService/',
//                   },
//                   {
//                     'name': 'ServiceRepositorySettings__ForceGiteaAuthentication',
//                     'value': 'false',
//                   },
//                 ],
//                 'resources': {

//                 },
//                 'terminationMessagePath': '/dev/termination-log',
//                 'terminationMessagePolicy': 'File',
//                 'imagePullPolicy': 'Always',
//               },
//             ],
//             'restartPolicy': 'Always',
//             'terminationGracePeriodSeconds': 30,
//             'dnsPolicy': 'ClusterFirst',
//             'securityContext': {

//             },
//             'imagePullSecrets': [
//               {
//                 'name': 'acr-secret',
//               },
//             ],
//             'schedulerName': 'default-scheduler',
//           },
//         },
//         'strategy': {
//           'type': 'RollingUpdate',
//           'rollingUpdate': {
//             'maxUnavailable': 1,
//             'maxSurge': 1,
//           },
//         },
//         'revisionHistoryLimit': 10,
//         'progressDeadlineSeconds': 2147483647,
//       },
//       'status': {
//         'observedGeneration': 3,
//         'replicas': 1,
//         'updatedReplicas': 1,
//         'readyReplicas': 1,
//         'availableReplicas': 1,
//         'conditions': [
//           {
//             'type': 'Available',
//             'status': 'True',
//             'lastUpdateTime': '2019-03-15T10:12:46Z',
//             'lastTransitionTime': '2019-03-15T10:12:46Z',
//             'reason': 'MinimumReplicasAvailable',
//             'message': 'Deployment has minimum availability.',
//           },
//         ],
//       },
//     },
//   ],
// };

const mockedMasterRepoStatus = {
  'name': 'master',
  'commit': {
    'id': 'b508b414aad0e4c70291883b71b924c94bb87446x',
    'message': 'fdsff\n',
    'url': '/matsgm/tjeneste_0319_1346/commit/b42fe0a18bf205765aafc0b1890867f1b8c5f644',
    'author': {
      'name': 'matsgm',
      'email': '@jugglingnutcase',
      'username': '',
    },
    'committer': {
      'name': 'matsgm',
      'email': '@jugglingnutcase',
      'username': '',
    },
    'verification': {
      'verified': false,
      'reason': 'gpg.error.not_signed_commit',
      'signature': '',
      'payload': '',
    },
    'timestamp': '2019-03-19T12:47:27Z',
  },
};

// FETCHES

export function* fetchDeploymentsSaga({
  env,
  org,
  repo,
}: DeployActions.IFetchDeploymentsAction): SagaIterator {
  try {
    const result = yield call(get,
      `http://${org}.apps.${env}.altinn.cloud/kuberneteswrapper/deployments?labelSelector=release=${org}-${repo}`);

    // const result = mockedDeploymentList;

    yield call(DeployDispatchers.fetchDeploymentsFulfilled, result, env);
  } catch (err) {
    yield call(DeployDispatchers.fetchDeploymentsRejected, err);
  }
}

export function* fetchMasterRepoStatusSaga({
  org,
  repo,
}: DeployActions.IFetchMasterRepoStatusAction): SagaIterator {
  try {
    const result = yield call(get,
      `/designerapi/Repository/Branch?owner=${org}&repository=${repo}&branch=master`);

    // const result = mockedMasterRepoStatus;

    yield call(DeployDispatchers.fetchMasterRepoStatusFulfilled, result);
  } catch (err) {
    yield call(DeployDispatchers.fetchMasterRepoStatusRejected, err);
  }
}

// WATCHES

export function* watchFetchDeploymentsSaga(): SagaIterator {
  yield takeLatest(
    DeployActionTypes.FETCH_DEPLOYMENTS,
    fetchDeploymentsSaga,
  );
}

export function* watchFetchMasterRepoStatusSaga(): SagaIterator {
  yield takeLatest(
    DeployActionTypes.FETCH_MASTER_REPO_STATUS,
    fetchMasterRepoStatusSaga,
  );
}

// // tslint:disable-next-line:space-before-function-paren
// export default function* (): SagaIterator {
//   yield fork(watchDeploySaga);
// }

export function* deploySagas(): SagaIterator {
  yield fork(watchFetchDeploymentsSaga);
  yield fork(watchFetchMasterRepoStatusSaga);
  // Insert more watchSagas here
}
