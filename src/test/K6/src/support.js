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
