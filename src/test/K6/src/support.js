//Fisher–Yates shuffle of an array
export function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Build a string in a format of query param to the endpoint
 * @param {*} filterParameters a json object with key as query name and value as query value
 * @example {"key1": "value1", "key2": "value2"}
 * @returns string a string like key1=value&key2=value2
 */
export function buildQueryParametersForEndpoint(filterParameters) {
  var query = '?';
  Object.keys(filterParameters).forEach(function (key) {
    query += key + '=' + filterParameters[key] + '&';
  });
  query = query.slice(0, -1);
  return query;
}

/**
 * @returns today's date with time 00:00:00 in ISO format
 */
export function todayDateInISO() {
  var todayDateTime = new Date();
  todayDateTime.setUTCHours(0, 0, 0, 0);
  return todayDateTime.toISOString();
}

/**
 * Check if a string is a guid
 * @param {String} stringToTest
 * @returns true or false
 */
export function isGuid(stringToTest) {
  var regexGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return regexGuid.test(stringToTest);
}

//Generate array with type of attachment for all the iterations
//based on the distribution across small, medium and large attachment
export function buildAttachmentTypeArray(distribution, totalIterations) {
  distribution = distribution.split(';');
  var small = distribution[0] != null ? buildArray(totalIterations * (distribution[0] / 100), 's') : [];
  var medium = distribution[1] != null ? buildArray(totalIterations * (distribution[1] / 100), 'm') : [];
  var large = distribution[2] != null ? buildArray(totalIterations * (distribution[2] / 100), 'l') : [];
  var attachmentTypes = small.concat(medium, large);
  return shuffle(attachmentTypes);
}

//Function to build an array with the specified value and count
function buildArray(count, value) {
  var array = [];
  for (var i = 0; i < count; i++) {
    array.push(value);
  }
  return array;
}
