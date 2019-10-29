import { AxiosError } from 'axios';
import { delay, SagaIterator } from 'redux-saga';
import { call, fork, race, take, takeLatest } from 'redux-saga/effects';
import { checkIfAxiosError } from '../../../../../shared/src/utils/networking';
import { get } from '../../../utils/networking';
import { releasesUrlGet } from '../../../utils/urlHelper';
import * as AppReleaseActionTypes from './../appReleaseActionTypes';
import AppReleaseActionDispatcher from './../appReleaseDispatcher';
import { IRelease, BuildResult, BuildStatus } from '../types';

const mockResults: IRelease[] = [
  {
    tagName: 'string',
    name: 'string',
    body: 'string',
    targetCommitish: 'string',
    build: {
      id: 'string',
      status: BuildStatus.completed,
      result: BuildResult.succeeded,
      started: '2019-10-25T07:49:02.042Z',
      finished: '2019-10-25T07:49:02.042Z',
    },
    id: 'string',
    created: '2019-10-25T07:49:02.042Z',
    createdBy: 'string',
    app: 'string',
    org: 'string',
  },
  {
    tagName: 'string',
    name: 'string',
    body: 'string',
    targetCommitish: 'string',
    build: {
      id: 'string',
      status: BuildStatus.completed,
      result: BuildResult.succeeded,
      started: '2019-10-25T07:49:02.042Z',
      finished: '2019-10-25T07:49:02.042Z',
    },
    id: 'string',
    created: '2019-10-25T07:49:02.042Z',
    createdBy: 'string',
    app: 'string',
    org: 'string',
  },
  {
    tagName: 'string',
    name: 'string',
    body: 'string',
    targetCommitish: 'string',
    build: {
      id: 'string',
      status: BuildStatus.completed,
      result: BuildResult.succeeded,
      started: '2019-10-25T07:49:02.042Z',
      finished: '2019-10-25T07:49:02.042Z',
    },
    id: 'string',
    created: '2019-10-25T07:49:02.042Z',
    createdBy: 'string',
    app: 'string',
    org: 'string',
  },
  {
    tagName: 'string',
    name: 'string',
    body: 'string',
    targetCommitish: 'string',
    build: {
      id: 'string',
      status: BuildStatus.completed,
      result: BuildResult.succeeded,
      started: '2019-10-25T07:49:02.042Z',
      finished: '2019-10-25T07:49:02.042Z',
    },
    id: 'string',
    created: '2019-10-25T07:49:02.042Z',
    createdBy: 'string',
    app: 'string',
    org: 'string',
  },
  {
    tagName: 'string',
    name: 'string',
    body: 'string',
    targetCommitish: 'string',
    build: {
      id: 'string',
      status: BuildStatus.completed,
      result: BuildResult.succeeded,
      started: '2019-10-25T07:49:02.042Z',
      finished: '2019-10-25T07:49:02.042Z',
    },
    id: 'string',
    created: '2019-10-25T07:49:02.042Z',
    createdBy: 'string',
    app: 'string',
    org: 'string',
  },
  {
    tagName: 'string',
    name: 'string',
    body: 'string',
    targetCommitish: 'string',
    build: {
      id: 'string',
      status: BuildStatus.completed,
      result: BuildResult.succeeded,
      started: '2019-10-25T07:49:02.042Z',
      finished: '2019-10-25T07:49:02.042Z',
    },
    id: 'string',
    created: '2019-10-25T07:49:02.042Z',
    createdBy: 'string',
    app: 'string',
    org: 'string',
  },
  {
    tagName: 'string',
    name: 'string',
    body: 'string',
    targetCommitish: 'string',
    build: {
      id: 'string',
      status: BuildStatus.completed,
      result: BuildResult.succeeded,
      started: '2019-10-25T07:49:02.042Z',
      finished: '2019-10-25T07:49:02.042Z',
    },
    id: 'string',
    created: '2019-10-25T07:49:02.042Z',
    createdBy: 'string',
    app: 'string',
    org: 'string',
  },
  {
    tagName: 'string',
    name: 'string',
    body: 'string',
    targetCommitish: 'string',
    build: {
      id: 'string',
      status: BuildStatus.completed,
      result: BuildResult.succeeded,
      started: '2019-10-25T07:49:02.042Z',
      finished: '2019-10-25T07:49:02.042Z',
    },
    id: 'string',
    created: '2019-10-25T07:49:02.042Z',
    createdBy: 'string',
    app: 'string',
    org: 'string',
  },
  {
    tagName: 'string',
    name: 'string',
    body: 'string',
    targetCommitish: 'string',
    build: {
      id: 'string',
      status: BuildStatus.completed,
      result: BuildResult.succeeded,
      started: '2019-10-25T07:49:02.042Z',
      finished: '2019-10-25T07:49:02.042Z',
    },
    id: 'string',
    created: '2019-10-25T07:49:02.042Z',
    createdBy: 'string',
    app: 'string',
    org: 'string',
  },
  {
    tagName: 'string',
    name: 'string',
    body: 'string',
    targetCommitish: 'string',
    build: {
      id: 'string',
      status: BuildStatus.completed,
      result: BuildResult.succeeded,
      started: '2019-10-25T07:49:02.042Z',
      finished: '2019-10-25T07:49:02.042Z',
    },
    id: 'string',
    created: '2019-10-25T07:49:02.042Z',
    createdBy: 'string',
    app: 'string',
    org: 'string',
  },
  {
    tagName: 'string',
    name: 'string',
    body: 'string',
    targetCommitish: 'string',
    build: {
      id: 'string',
      status: BuildStatus.completed,
      result: BuildResult.succeeded,
      started: '2019-10-25T07:49:02.042Z',
      finished: '2019-10-25T07:49:02.042Z',
    },
    id: 'string',
    created: '2019-10-25T07:49:02.042Z',
    createdBy: 'string',
    app: 'string',
    org: 'string',
  },
  {
    tagName: 'string',
    name: 'string',
    body: 'string',
    targetCommitish: 'string',
    build: {
      id: 'string',
      status: BuildStatus.completed,
      result: BuildResult.succeeded,
      started: '2019-10-25T07:49:02.042Z',
      finished: '2019-10-25T07:49:02.042Z',
    },
    id: 'string',
    created: '2019-10-25T07:49:02.042Z',
    createdBy: 'string',
    app: 'string',
    org: 'string',
  },
  {
    tagName: 'Test-of-a-really-long-tag-name-so-what-should-we-write-here-you-might-ask-lets-write-about-dogs',
    name: 'dogs-come-in-various-breeds-and-all-breeds-have-their-own-usage-lets-dig-a-little-deeper-shall-we',
    body: `
    Hundedyr som gruppe oppsto alt for omkring 40–60 millioner år siden, men tamhunden stammer fra langt nyere tid.
    Den har tidvis blitt regnet som både en selvstendig art og en underart, siden opphavslinjene har vært vanskelige å
    dokumentere vitenskapelig. Derfor har det versert en rekke mer eller mindre kvalitative teorier, med større og
    mindre oppslutning. Moderne forskning med DNA slår imidlertid fast, at ulv (Canis lupus) og tamhund har et felles
    opphav, et stort, ulvelignende hundedyr som levde i Europa (men nødvendigvis ikke bare der), men nå er utdødd.
    Analysene antyder at hundens nære slektskap med ulven, og derigjennom all uenigheten om klassifiseringen gjennom
    årene, stammer fra naturlige krysninger (altså hybridisering) mellom disse to artene.[4] Hybridiseringen har trolig
    pågått gjennom årtusener og kan forklare mange av de spørmålene som har reist seg i senere års forskning..
    Den linjen i stamtreet, som førte fram til tamhunden, oppsto trolig alt for omkring 76 000–135 000 år siden,[5] og
    en studie publisert 16. januar 2014 antyder at tamhunden og ulven trolig kun har én felles stamform, som trolig
    eksisterte for omkring 9 000–34 000 år siden. Den 27. mars 2014 dukker det opp en australsk studie som slår fast
    at dingo (C. dingo) kan være en selvstendig art[2], noe som naturligvis styrker teorien om at ulv, tamhund og dingo
    har et felles opphav.[2] Grunnlaget for studien var fossiler, flere skinn og beinfragmenter etter dingoer som
    dateres til tiden før det moderne mennesket bragte med seg tamhunder til Australia. Altså til tiden før
    hybridisering mellom hund og dingo fant sted.[2]
    `,
    targetCommitish: 'string',
    build: {
      id: 'string',
      status: BuildStatus.completed,
      result: BuildResult.succeeded,
      started: '2019-10-25T07:49:02.042Z',
      finished: '2019-10-25T07:49:02.042Z',
    },
    id: 'string',
    created: '2019-10-25T07:49:02.042Z',
    createdBy: 'string',
    app: 'string',
    org: 'string',
  },
];

function* getReleasesSaga(): SagaIterator {
  try {
    const result: any = yield call(get, releasesUrlGet);
    yield call(AppReleaseActionDispatcher.getAppReleasesFulfilled, result.results);
  } catch (err) {
    if (checkIfAxiosError(err)) {
      const {response: {status}} = err as AxiosError;
      yield call(AppReleaseActionDispatcher.getAppReleasesRejected, status);
    }
  }
}

export function* watchGetReleasesSaga(): SagaIterator {
  yield takeLatest(
    AppReleaseActionTypes.GET_APP_RELEASES,
    getReleasesSaga,
  );
}

function* getReleasesIntervalSaga(): SagaIterator {
  while (true) {
    try {
      yield call(getReleasesSaga);
      yield call(delay, 5000);
    } catch (err) {
      yield call(AppReleaseActionDispatcher.getAppReleasesRejected, 1);
    }
  }
}

function* watchGetReleasesIntervalSaga(): SagaIterator {
  while (true) {
    yield take(AppReleaseActionTypes.GET_APP_RELEASES_START_INTERVAL);
    yield race({
      do: call(getReleasesIntervalSaga),
      cancel: take(AppReleaseActionTypes.GET_APP_RELEASES_STOP_INTERVAL),
    });
  }
}

export default function*(): SagaIterator {
  yield fork(watchGetReleasesSaga);
  yield fork(watchGetReleasesIntervalSaga);
}
