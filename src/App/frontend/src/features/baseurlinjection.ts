// Apps are running in a subpath of `/{org}/{app}` both locally and in deployed environments
// some features make use of relative paths that should resolve relative to this subpath.
// * `image.src` on the `ImageComponent` might have `some-image.jpg` which we expect to then exist in the `wwwroot/`
//   folder of the app.
// The `base` element in the HTML head will make relative references resolve from `base.href`.
// Bugreport: https://github.com/Altinn/app-frontend-react/issues/2257
{
  const { protocol, hostname, port: _port } = window.location;
  const { org, app } = window;

  // Only inject a base when we have a real http(s) origin to resolve against. During Percy
  // visual testing this script is re-executed inside the serialized snapshot, where
  // `window.location` may not be the real app origin (e.g. `file:`). Computing a base from a
  // non-http(s) location would produce a broken `<base href="file://…">` that poisons asset
  // resolution (CSS/images stop loading). We also guard against re-injecting when a `<base>`
  // already exists (the captured, correct base survives in the snapshot), keeping this idempotent.
  const hasHttpOrigin = protocol === 'http:' || protocol === 'https:';
  if (hasHttpOrigin && !document.querySelector('base')) {
    const base = document.createElement('base');
    const isDefaultHttpsPort = protocol === 'https:' && _port === '443';
    const isDefaultHttpPort = protocol === 'http:' && _port === '80';
    const isDefaultPort = isDefaultHttpsPort || isDefaultHttpPort;
    const port = _port && !isDefaultPort ? `:${_port}` : '';
    base.href = `${protocol}//${hostname}${port}/${org}/${app}/`;
    document.head.appendChild(base);
  }
}
