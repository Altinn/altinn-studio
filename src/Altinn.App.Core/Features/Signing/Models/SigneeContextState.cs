using System.Text.Json.Serialization;

namespace Altinn.App.Core.Features.Signing.Models;

/// <summary>
/// The signee state
/// </summary>
internal sealed class SigneeContextState
{
    /// <summary>
    /// Initializes a new instance of the <see cref="SigneeContextState"/> class.
    /// </summary>
    public SigneeContextState() { }

    /// <summary>
    /// Indicates whether signee has been delegated rights to sign.
    /// </summary>
    [JsonPropertyName("isAccessDelegated")]
    public bool IsAccessDelegated { get; set; }

    /// <summary>
    /// The reason why the delegation failed.
    /// </summary>
    [JsonPropertyName("delegationFailedReason")]
    public string? DelegationFailedReason { get; set; }

    /// <summary>
    /// Indicates whether the signee has been messaged about the signature call to action.
    /// </summary>
    [JsonPropertyName("hasBeenMessagedForCallToSign")]
    public bool HasBeenMessagedForCallToSign { get; set; }

    /// <summary>
    /// The id of the call to action message that was sent to the signee.
    /// </summary>
    [JsonPropertyName("ctaCorrespondenceId")]
    public Guid? CtaCorrespondenceId { get; set; }

    /// <summary>
    /// The reason why the message failed.
    /// </summary>
    [JsonPropertyName("callToSignFailedReason")]
    public string? CallToSignFailedReason { get; set; }
}
