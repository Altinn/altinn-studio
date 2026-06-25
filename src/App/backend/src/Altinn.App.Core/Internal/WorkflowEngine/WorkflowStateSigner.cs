using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Altinn.App.Core.Infrastructure.Clients.Secrets;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// Computes and verifies the detached HMAC-SHA256 signature that wraps the opaque workflow callback state
/// blob. Capture and restore both go through this single helper so the two paths cannot diverge.
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
    public string Sign(string payload)
    {
        AppCode signingCode = _secretProvider.GetSigningSecret();
        string signature = ComputeSignature(signingCode.Code, payload);
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
    /// expired secret id, signature mismatch) — never reveals which check failed.
    /// </summary>
    public string Verify(string envelopeJson)
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

        AppCode? code = null;
        for (int i = 0; i < validationCodes.Count; i++)
        {
            if (validationCodes[i].Id == envelope.SecretId)
            {
                code = validationCodes[i];
                break;
            }
        }

        if (code is null)
        {
            throw new WorkflowCallbackStateException(
                "Workflow callback state envelope references an unknown signing secret."
            );
        }

        // Reject codes that are themselves expired (with the same clock skew the token validator applies), so
        // the blob and the callback token fail together during rotation.
        if (_timeProvider.GetUtcNow() > code.ExpiresAt + _clockSkew)
        {
            throw new WorkflowCallbackStateException(
                "Workflow callback state envelope was signed with an expired secret."
            );
        }

        string expected = ComputeSignature(code.Code, envelope.Payload);
        if (!FixedTimeEquals(expected, envelope.Signature))
        {
            throw new WorkflowCallbackStateException("Workflow callback state envelope signature is invalid.");
        }

        return envelope.Payload;
    }

    private static string ComputeSignature(string secret, string payload)
    {
        byte[] key = Encoding.UTF8.GetBytes(secret);
        byte[] data = Encoding.UTF8.GetBytes(payload);
        byte[] hash = HMACSHA256.HashData(key, data);
        return Convert.ToBase64String(hash);
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
