namespace Altinn.Studio.Gateway.Contracts.Workflows;

/// <summary>
/// Problem-details shaped (RFC 9457) error envelope produced by the gateway itself for the
/// workflow pass-through endpoints — as opposed to workflow engine responses, which are
/// streamed through unmodified. Consumers distinguish gateway-produced problems from
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

    /// <summary>Problem type reported when the gateway has no service owner configured.</summary>
    public const string MissingServiceOwnerType = "urn:altinn:studio:gateway:missing-service-owner";
}
