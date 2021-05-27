/**
 * Function builds a JSOn object for the k6 scenario to be used in load test
 * @param {*} type type of the executor: constantvus, sharediter, ramp
 * @param {*} vus number of virtual users
 * @param {*} iterations number of iterations
 * @param {*} maxDuration duration of load
 * @param {*} stages only for type: ramp in format "10s:5,40s:20,10s:5"
 */
export function k6scenarios(type, vus, iterations, maxDuration, stages) {
  var scenario = {};
  switch (type) {
    case 'constantvus':
      constantVus.vus = vus;
      constantVus.duration = maxDuration;
      scenario.constantvus = constantVus;
      break;
    case 'sharediter':
      sharedIterations.vus = vus;
      sharedIterations.iterations = iterations;
      sharedIterations.maxDuration = maxDuration;
      scenario.sharedIter = sharedIterations;
      break;
    case 'ramp':
      rampingVus.stages = buildRamp(stages);
      scenario.ramp = rampingVus;
      break;
  }
  return scenario;
}

var constantVus = {
  executor: 'constant-vus',
  vus: 1,
  duration: '1m',
};

var sharedIterations = {
  executor: 'shared-iterations',
  vus: 1,
  iterations: 2,
  maxDuration: '10m',
};

var rampingVus = {
  executor: 'ramping-vus',
  startVUs: 0,
  stages: [],
  gracefulRampDown: '30s',
};

/**
 * function returns an array of JSON object for ramping-vus scenario in format
 * [{duration : 10s, targer: 5}]
 * @param {*} stages a string in format: 10s:5,40s:20,10s:5
 */
function buildRamp(stages) {
  var stagesArray = [];
  var stages = stages.split(',');
  stages.forEach((element) => {
    element = element.split(':');
    var ramp = {
      duration: element[0],
      target: element[1],
    };
    stagesArray.push(ramp);
  });
  return stagesArray;
}
