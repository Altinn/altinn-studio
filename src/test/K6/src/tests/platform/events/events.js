/* 
    Test script to platform events api with user token
    Command: docker-compose run k6 run src/tests/platform/events/events.js -e env=*** -e org=*** -e username=*** -e userpwd=*** -e level2app=***
*/
import { check } from "k6";
import { addErrorCount } from "../../../errorcounter.js";
import * as events from "../../../api/platform/events.js"
import * as appInstances from "../../../api/app/instances.js"
import * as setUpData from "../../../setup.js";

const userName = __ENV.username;
const userPassword = __ENV.userpwd;
const appOwner = __ENV.org;
const appName = __ENV.level2app;

export const options = {
    thresholds: {
        "errors": ["count<1"]
    },
    setupTimeout: '1m'
};

//Function to setup data and return userData
export function setup() {
    var aspxauthCookie = setUpData.authenticateUser(userName, userPassword);
    var altinnStudioRuntimeCookie = setUpData.getAltinnStudioRuntimeToken(aspxauthCookie);
    var data = setUpData.getUserData(altinnStudioRuntimeCookie, appOwner, appName);
    setUpData.clearCookies();
    var instance = appInstances.postInstance(altinnStudioRuntimeCookie, data["partyId"], appOwner, appName);
    data.instanceId = JSON.parse(instance.body).id;
    data.RuntimeToken = altinnStudioRuntimeCookie;
    return data;
};

//Test for platform events and validate response
export default function (data) {
    const partyId = data["partyId"];
    const runtimeToken = data["RuntimeToken"];
    var res, success, eventsFilter;

    //Find today's date to be passed a filter to get events
    var from = new Date();
    from.setHours(0, 0, 0);
    from = from.toISOString();

    //Test to post events and assert that response is 403
    res = events.postEvents(runtimeToken);
    success = check(res, {
        "POST Events status is 403:": (r) => r.status === 403
    });
    addErrorCount(success);

    //Test to get events from today based on party id, app and org
    eventsFilter = {
        "party": partyId,
        "from": from
    };
    res = events.getEventsByparty(runtimeToken, eventsFilter);
    success = check(res, {
        "GET Todays Events based on party status is 200:": (r) => r.status === 200,
        "GET Todays Events based on party count greater than 0:": (r) => JSON.parse(r.body).length > 0,
        "GET Todays Events lists only events for party:": (r) => {
            var events = r.json();
            return events.every(event => event.subject.includes(partyId));
        }
    });
    addErrorCount(success);

    //Test to get events api by org and app name and check that a person cannot use the api
    res = events.getEvents(runtimeToken, appOwner, appName, null);
    success = check(res, {
        "GET Todays Events by org app name status is 401:": (r) => r.status === 401
    });
    addErrorCount(success);
};
