const ORG_APP_PREFIX = '/{org}/{app}';

/**
 * Strips the /{org}/{app} prefix from all paths and removes the org/app
 * path parameters, since the custom axios instance sets baseURL to include them.
 *
 * @param {import('openapi3-ts/oas30').OpenAPIObject} spec
 * @returns {import('openapi3-ts/oas30').OpenAPIObject}
 */
module.exports = (spec) => {
  const transformedPaths = {};

  for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
    const newPath = path.startsWith(ORG_APP_PREFIX) ? path.slice(ORG_APP_PREFIX.length) || '/' : path;

    const transformedPathItem = { ...pathItem };

    for (const method of ['get', 'put', 'post', 'delete', 'patch', 'options', 'head']) {
      const operation = transformedPathItem[method];
      if (operation?.parameters) {
        transformedPathItem[method] = {
          ...operation,
          parameters: operation.parameters.filter(
            (param) => !(param.name === 'org' && param.in === 'path') && !(param.name === 'app' && param.in === 'path'),
          ),
        };
      }
    }

    transformedPaths[newPath] = transformedPathItem;
  }

  return {
    ...spec,
    paths: transformedPaths,
  };
};
