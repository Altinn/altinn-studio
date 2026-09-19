namespace Altinn.Studio.Gateway.Contracts.Workflows;

/// <summary>
/// Reader-side contract for the problem-details (RFC 9457) error envelopes the gateway itself
/// produces on the workflow pass-through endpoints — as opposed to workflow engine responses,
/// which are streamed through unmodified. The gateway serializes these with
/// <c>Results.Problem</c> (camelCase keys, <c>application/problem+json</c>); consumers such as
/// Designer deserialize into this shape and discriminate gateway-produced problems from
/// engine-produced ones by the <see cref="Type"/> value.
/// </summary>
public record GatewayProblem(string Type, string Title, int Status, string Detail)
{
    /// <summary>
    /// Problem type reported when the workflow engine could not be reached (not deployed in
    /// the environment, connection refused, or timed out). Designer maps this to a distinct
    /// "engine unavailable" state rather than a generic error.
    /// </summary>
    public const string WorkflowEngineUnavailableType = "urn:altinn:studio:gateway:workflow-engine-unavailable";

    /// <summary>Problem type reported when the app route parameter is not a valid app name.</summary>
    public const string InvalidAppNameType = "urn:altinn:studio:gateway:invalid-app-name";

    /// <summary>
    /// Problem type reported when a request carries a query parameter the route does not
    /// recognize. The gateway rejects rather than silently drops unknown parameters, so
    /// version skew between Designer and per-cluster gateways fails loudly instead of
    /// returning unfiltered data.
    /// </summary>
    public const string UnknownQueryParameterType = "urn:altinn:studio:gateway:unknown-query-parameter";
}
