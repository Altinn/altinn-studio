namespace Altinn.Studio.Observability.Proxy.Configuration;

/// <summary>
/// One query API of a signal's storage pair, served below its own public prefix,
/// <c>{PathPrefix}/{RouteGroup}</c>, which is the base URL of the Grafana datasource that calls it.
/// The proxy strips that prefix and puts <paramref name="StoragePath"/> in its place, and a token
/// reaches the API when it is granted <paramref name="RouteGroup"/>.
/// </summary>
/// <param name="RouteGroup">The route group a token needs, and the public path segment below the prefix.</param>
/// <param name="StoragePath">Where the storage serves the API, or empty for its root.</param>
/// <param name="Endpoints">The paths below the public prefix that the query token may reach.</param>
internal sealed record ReadApi(string RouteGroup, string StoragePath, IReadOnlyList<ReadEndpoint> Endpoints)
{
    /// <summary>Whether the query token may send <paramref name="method"/> to <paramref name="readPath"/>.</summary>
    public bool AllowsRead(string method, string readPath) => ReadEndpoint.Allows(Endpoints, method, readPath);
}
