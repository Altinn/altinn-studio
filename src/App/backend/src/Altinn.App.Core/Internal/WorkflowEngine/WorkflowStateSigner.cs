using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Altinn.App.Core.Infrastructure.Clients.Secrets;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// Computes and verifies the detached HMAC-SHA256 signature that wraps an opaque blob the app sends
/// through the workflow engine and gets back again — the callback state blob, and the body of a message
/// forwarded into a mailbox. Every producing and consuming path goes through this single helper so they
/// cannot diverge, and each names its own <see cref="SigningDomain"/>, which selects the key the
/// signature is computed under, so envelopes minted for one cannot be replayed as the other.
/// </summary>
internal sealed class WorkflowStateSigner
{
    // Mirror the callback token validator: a code that is itself expired (beyond this skew) must not validate
    // a blob, so a leaked-but-still-mounted expired code stops being a usable signing boundary, and blob and
    // token fail together during rotation.
    private static readonly TimeSpan _clockSkew = TimeSpan.FromMinutes(5);

    private readonly IWorkflowCallbackSecretProvider _secretProvider;
    private readonly TimeProvider _timeProvider;

    public WorkflowStateSigner(IWorkflowCallbackSecretProvider secretProvider, TimeProvider? timeProvider = null)
    {
        _secretProvider = secretProvider;
        _timeProvider = timeProvider ?? TimeProvider.System;
    }

    /// <summary>
    /// Wraps <paramref name="payload"/> in a signed envelope, signing the exact transmitted bytes with the
    /// current signing code.
    /// </summary>
    /// <param name="payload">The exact bytes to transport and sign.</param>
    /// <param name="domain">
    /// What this envelope is and what it binds; constructible only through <see cref="SigningDomain"/>'s
    /// factories, so a new call site cannot silently land in another domain's signature space.
    /// </param>
    public string Sign(string payload, SigningDomain domain)
    {
        AppCode signingCode = _secretProvider.GetSigningSecret();
        string signature = ComputeSignature(signingCode.Code, domain, payload);
        var envelope = new SignedWorkflowState
        {
            Payload = payload,
            Signature = signature,
            SecretId = signingCode.Id,
        };
        return JsonSerializer.Serialize(envelope);
    }

    /// <summary>
    /// Verifies <paramref name="envelopeJson"/> and returns the inner payload string on success.
    /// Throws <see cref="WorkflowCallbackStateException"/> on any failure (malformed envelope, unknown or
    /// expired secret id, signature mismatch, wrong domain) — never reveals which check failed.
    /// </summary>
    /// <param name="envelopeJson">The transported envelope.</param>
    /// <param name="domain">
    /// The domain the caller expects; an envelope minted for another fails exactly like a tampered one.
    /// </param>
    public string Verify(string envelopeJson, SigningDomain domain)
    {
        SignedWorkflowState envelope;
        try
        {
            envelope =
                JsonSerializer.Deserialize<SignedWorkflowState>(envelopeJson)
                ?? throw new WorkflowCallbackStateException("Workflow callback state envelope deserialized to null.");
        }
        catch (JsonException ex)
        {
            throw new WorkflowCallbackStateException("Failed to deserialize workflow callback state envelope.", ex);
        }

        IReadOnlyList<AppCode> validationCodes;
        try
        {
            validationCodes = _secretProvider.GetValidationSecrets();
        }
        catch (WorkflowCallbackSecretNotFoundException ex)
        {
            throw new WorkflowCallbackStateException(
                "No workflow callback signing secret is available to verify the state envelope.",
                ex
            );
        }

        AppCode code =
            validationCodes.FirstOrDefault(t => t.Id == envelope.SecretId)
            ?? throw new WorkflowCallbackStateException(
                "Workflow callback state envelope references an unknown signing secret."
            );

        // Reject codes that are themselves expired (with the same clock skew the token validator applies), so
        // the blob and the callback token fail together during rotation.
        if (_timeProvider.GetUtcNow() > code.ExpiresAt + _clockSkew)
        {
            throw new WorkflowCallbackStateException(
                "Workflow callback state envelope was signed with an expired secret."
            );
        }

        string expected = ComputeSignature(code.Code, domain, envelope.Payload);
        if (!FixedTimeEquals(expected, envelope.Signature))
        {
            throw new WorkflowCallbackStateException("Workflow callback state envelope signature is invalid.");
        }

        return envelope.Payload;
    }

    /// <summary>
    /// Base64(HMACSHA256(key = <see cref="DeriveKey"/>(code, domain), data = UTF8(payload))). Domain
    /// separation lives in the <em>key</em>, not the signed data: a data-prefix tag would leave a collision
    /// (an untagged payload equal to <c>tag + separator + P</c>) to argue away.
    /// </summary>
    private static string ComputeSignature(string secret, SigningDomain domain, string payload)
    {
        byte[] key = DeriveKey(secret, domain);
        byte[] hash = HMACSHA256.HashData(key, Encoding.UTF8.GetBytes(payload));
        return Convert.ToBase64String(hash);
    }

    /// <summary>
    /// The per-domain key: <c>HMACSHA256(key = UTF8(code), data = UTF8(tag))</c>. A tagless domain
    /// (<see cref="SigningPurpose.CallbackState"/>) uses the app-code directly — the original computation,
    /// kept byte for byte so old state blobs still verify.
    /// </summary>
    private static byte[] DeriveKey(string secret, SigningDomain domain)
    {
        byte[] key = Encoding.UTF8.GetBytes(secret);
        return domain.Tag is { } tag ? HMACSHA256.HashData(key, Encoding.UTF8.GetBytes(tag)) : key;
    }

    private static bool FixedTimeEquals(string a, string b)
    {
        // Compare the raw signature bytes in constant time. Decoding failures (malformed Base64) are treated
        // as a non-match rather than thrown, so a forged signature value cannot be distinguished by behavior.
        Span<byte> bufferA = stackalloc byte[32];
        Span<byte> bufferB = stackalloc byte[32];
        if (
            !Convert.TryFromBase64String(a, bufferA, out int writtenA)
            || !Convert.TryFromBase64String(b, bufferB, out int writtenB)
        )
        {
            return false;
        }

        return CryptographicOperations.FixedTimeEquals(bufferA[..writtenA], bufferB[..writtenB]);
    }
}
