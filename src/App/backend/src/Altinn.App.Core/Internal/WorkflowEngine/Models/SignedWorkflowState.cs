using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.WorkflowEngine.Models;

/// <summary>
/// Tamper-evident envelope around the opaque workflow callback state blob.
///
/// The app both produces (at enqueue) and consumes (at callback) this blob; the engine only round-trips it
/// opaquely. A detached HMAC-SHA256 signature — keyed by the per-app <c>WorkflowEngineCallback</c> app-code —
/// binds the transported <see cref="Payload"/> to a secret only the app holds, so a leaked callback token
/// alone can no longer be combined with a forged or tampered blob to drive ServiceOwner writes.
/// </summary>
internal sealed record SignedWorkflowState
{
    /// <summary>
    /// The serialized <see cref="WorkflowCallbackState"/> JSON. The signature is computed over these exact
    /// transmitted bytes (UTF-8), never over a re-serialized object, to avoid canonicalization drift.
    /// </summary>
    [JsonPropertyName("payload")]
    public required string Payload { get; init; }

    /// <summary>
    /// Base64(HMACSHA256(key = UTF8(appCode.Code), data = UTF8(<see cref="Payload"/>))).
    /// </summary>
    [JsonPropertyName("signature")]
    public required string Signature { get; init; }

    /// <summary>
    /// The id of the <c>WorkflowEngineCallback</c> app-code used to sign <see cref="Payload"/>. Used to select
    /// the right validation secret during key rotation, mirroring the callback token validator.
    /// </summary>
    [JsonPropertyName("secretId")]
    public required string SecretId { get; init; }
}
