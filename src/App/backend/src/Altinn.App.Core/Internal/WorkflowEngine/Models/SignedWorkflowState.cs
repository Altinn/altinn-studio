using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.WorkflowEngine.Models;

/// <summary>
/// Tamper-evident envelope around an opaque blob the app round-trips through the workflow engine — the
/// callback state blob, and the body of a message forwarded into a mailbox.
///
/// The app both produces and consumes these blobs; the engine only round-trips them opaquely. A detached
/// HMAC-SHA256 signature — keyed by the per-app <c>WorkflowEngineCallback</c> app-code — binds the
/// transported <see cref="Payload"/> to a secret only the app holds, so a leaked callback token
/// alone can no longer be combined with a forged or tampered blob to drive ServiceOwner writes.
/// </summary>
internal sealed record SignedWorkflowState
{
    /// <summary>
    /// The exact transported bytes: a serialized <see cref="WorkflowCallbackState"/> for a state blob, the
    /// forwarded body for a message. The signature is computed over these exact transmitted bytes (UTF-8),
    /// never over a re-serialized object, to avoid canonicalization drift.
    /// </summary>
    [JsonPropertyName("payload")]
    public required string Payload { get; init; }

    /// <summary>
    /// The detached signature over <see cref="Payload"/>, computed by <c>WorkflowStateSigner.ComputeSignature</c> —
    /// Base64 of an HMAC-SHA256 taken under a key derived from the app-code and the envelope's
    /// <c>SigningDomain</c>. The domain is not carried here: the verifier states which one it expects, so an
    /// envelope minted for another fails exactly like a tampered one.
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
