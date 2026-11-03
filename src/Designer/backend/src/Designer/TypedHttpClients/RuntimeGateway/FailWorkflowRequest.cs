using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;

/// <summary>
/// Body of the runtime gateway's fail pass-through: why a parked workflow is being given up on.
/// The engine records it as the parked step's final error entry, so it names who decided.
/// </summary>
public sealed record FailWorkflowRequest([property: JsonPropertyName("reason")] string Reason);
