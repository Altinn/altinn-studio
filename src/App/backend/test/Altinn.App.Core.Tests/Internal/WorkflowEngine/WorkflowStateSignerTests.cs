using System.Text.Json;
using Altinn.App.Core.Infrastructure.Clients.Secrets;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Microsoft.Extensions.Time.Testing;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

public class WorkflowStateSignerTests
{
    private const string Payload = """{"instance":{"id":"501337/abc"},"formData":[]}""";

    private readonly Mock<IWorkflowCallbackSecretProvider> _secretProviderMock = new(MockBehavior.Strict);

    private WorkflowStateSigner CreateSut(TimeProvider? timeProvider = null) =>
        new(_secretProviderMock.Object, timeProvider);

    private static AppCode Code(string id, string code, DateTimeOffset? expiresAt = null) =>
        new()
        {
            Id = id,
            Code = code,
            IssuedAt = DateTimeOffset.UtcNow.AddDays(-1),
            ExpiresAt = expiresAt ?? DateTimeOffset.UtcNow.AddDays(186),
        };

    /// <summary>
    /// Known-answer vectors for the callback state blob's signature: secret, payload, and the Base64 HMAC-SHA256 an
    /// independent implementation produces for the pair. They pin the state domain as <em>underived</em> — computed
    /// under the app-code directly — so the domain separation introduced for forwarded messages must leave
    /// <see cref="SigningPurpose.CallbackState"/> tagless, which is what lets state blobs signed by an earlier build
    /// still verify. A sign-then-verify round-trip would agree with itself after any such change. The long-secret
    /// vector additionally pins behaviour past HMAC-SHA256's 64-byte block, where the key is hashed before use.
    /// </summary>
    public static TheoryData<string, string, string> GoldenVectors =>
        new()
        {
            {
                "secret-code-long-enough-for-hmac",
                """{"instance":{"id":"501337/abc"},"formData":[]}""",
                "y9yRyhUFbu53bVAHah7WGENvZ8TCUrf/nLKZIBxdoEs="
            },
            { "secret-code-long-enough-for-hmac", "", "ShrD7feAxlztge8964fvlXSP7ZtYme9aZsLe+lWwc2o=" },
            {
                "secret-code-long-enough-for-hmac",
                """{"instance":{"id":"501337/abc"},"formData":[{"æøå":"Blåbær"}]}""",
                "WkcPi6ADszCsTXgVh1NobAG9KDStbpDcbyNVeUMBEiQ="
            },
            {
                // 65 bytes: one past the block size, so HMAC hashes the key first.
                "wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww",
                """{"instance":{"id":"501337/abc"},"formData":[]}""",
                "AjUEgN/F6HFUKtkBrogharT7L6WdlmoC0OnP9GKLZ3E="
            },
        };

    [Theory]
    [MemberData(nameof(GoldenVectors))]
    public void Sign_ReproducesTheKnownSignature(string code, string payload, string expected)
    {
        _secretProviderMock.Setup(x => x.GetSigningSecret()).Returns(Code("id-1", code));
        var sut = CreateSut();

        var envelope = JsonSerializer.Deserialize<SignedWorkflowState>(sut.Sign(payload, SigningDomain.CallbackState))!;

        Assert.Equal(expected, envelope.Signature);
    }

    [Theory]
    [MemberData(nameof(GoldenVectors))]
    public void Verify_AcceptsAnEnvelopeCarryingTheKnownSignature(string code, string payload, string expected)
    {
        // The other half of the compatibility claim: a blob an earlier build produced — here hand-built from the
        // vector rather than signed by this one — must still open, mid-transition.
        _secretProviderMock.Setup(x => x.GetValidationSecrets()).Returns([Code("id-1", code)]);
        var sut = CreateSut();

        string envelope = JsonSerializer.Serialize(
            new SignedWorkflowState
            {
                Payload = payload,
                Signature = expected,
                SecretId = "id-1",
            }
        );

        Assert.Equal(payload, sut.Verify(envelope, SigningDomain.CallbackState));
    }

    [Fact]
    public void Sign_WithADefaultDomain_Throws()
    {
        // SigningDomain is a struct, so `default` is reachable. It must lead nowhere rather than into the
        // state-blob domain, which is why SigningPurpose.Unspecified occupies the enum's default slot.
        _secretProviderMock
            .Setup(x => x.GetSigningSecret())
            .Returns(Code("id-1", "secret-code-long-enough-for-hmac"));
        var sut = CreateSut();

        Assert.Throws<InvalidOperationException>(() => sut.Sign(Payload, default));
    }

    [Fact]
    public void SignThenVerify_RoundTrips_ReturnsOriginalPayload()
    {
        var code = Code("id-1", "secret-code-long-enough-for-hmac");
        _secretProviderMock.Setup(x => x.GetSigningSecret()).Returns(code);
        _secretProviderMock.Setup(x => x.GetValidationSecrets()).Returns([code]);
        var sut = CreateSut();

        string envelope = sut.Sign(Payload, SigningDomain.CallbackState);
        string restored = sut.Verify(envelope, SigningDomain.CallbackState);

        Assert.Equal(Payload, restored);
    }

    [Fact]
    public void Sign_ProducesEnvelopeWithSecretIdAndExactPayload()
    {
        var code = Code("id-1", "secret-code-long-enough-for-hmac");
        _secretProviderMock.Setup(x => x.GetSigningSecret()).Returns(code);
        var sut = CreateSut();

        string envelopeJson = sut.Sign(Payload, SigningDomain.CallbackState);
        var envelope = JsonSerializer.Deserialize<SignedWorkflowState>(envelopeJson);

        Assert.NotNull(envelope);
        Assert.Equal("id-1", envelope.SecretId);
        // Signed over the exact transmitted payload bytes, never a re-serialized object.
        Assert.Equal(Payload, envelope.Payload);
        Assert.False(string.IsNullOrEmpty(envelope.Signature));
    }

    [Fact]
    public void Verify_TamperedPayload_Throws()
    {
        var code = Code("id-1", "secret-code-long-enough-for-hmac");
        _secretProviderMock.Setup(x => x.GetSigningSecret()).Returns(code);
        _secretProviderMock.Setup(x => x.GetValidationSecrets()).Returns([code]);
        var sut = CreateSut();

        var envelope = JsonSerializer.Deserialize<SignedWorkflowState>(sut.Sign(Payload, SigningDomain.CallbackState))!;
        // Keep the original (valid) signature but swap in a different payload.
        string tampered = JsonSerializer.Serialize(
            envelope with
            {
                Payload = """{"instance":{"id":"501337/EVIL"},"formData":[]}""",
            }
        );

        Assert.Throws<WorkflowCallbackStateException>(() => sut.Verify(tampered, SigningDomain.CallbackState));
    }

    [Fact]
    public void Verify_TamperedSignature_Throws()
    {
        var code = Code("id-1", "secret-code-long-enough-for-hmac");
        _secretProviderMock.Setup(x => x.GetSigningSecret()).Returns(code);
        _secretProviderMock.Setup(x => x.GetValidationSecrets()).Returns([code]);
        var sut = CreateSut();

        var envelope = JsonSerializer.Deserialize<SignedWorkflowState>(sut.Sign(Payload, SigningDomain.CallbackState))!;
        // Valid Base64 of the wrong length/content — must be rejected, not throw on decode.
        string tampered = JsonSerializer.Serialize(envelope with { Signature = Convert.ToBase64String(new byte[32]) });

        Assert.Throws<WorkflowCallbackStateException>(() => sut.Verify(tampered, SigningDomain.CallbackState));
    }

    [Fact]
    public void Verify_MalformedBase64Signature_Throws()
    {
        var code = Code("id-1", "secret-code-long-enough-for-hmac");
        _secretProviderMock.Setup(x => x.GetSigningSecret()).Returns(code);
        _secretProviderMock.Setup(x => x.GetValidationSecrets()).Returns([code]);
        var sut = CreateSut();

        var envelope = JsonSerializer.Deserialize<SignedWorkflowState>(sut.Sign(Payload, SigningDomain.CallbackState))!;
        string tampered = JsonSerializer.Serialize(envelope with { Signature = "!!!not-base64!!!" });

        Assert.Throws<WorkflowCallbackStateException>(() => sut.Verify(tampered, SigningDomain.CallbackState));
    }

    [Fact]
    public void Verify_UnknownSecretId_Throws()
    {
        var signingCode = Code("id-1", "secret-code-long-enough-for-hmac");
        _secretProviderMock.Setup(x => x.GetSigningSecret()).Returns(signingCode);
        // Validation set has a different id only.
        _secretProviderMock.Setup(x => x.GetValidationSecrets()).Returns([Code("id-other", "other-code-long-enough")]);
        var sut = CreateSut();

        string envelope = sut.Sign(Payload, SigningDomain.CallbackState);

        Assert.Throws<WorkflowCallbackStateException>(() => sut.Verify(envelope, SigningDomain.CallbackState));
    }

    [Fact]
    public void Verify_MissingSecretId_Throws()
    {
        var code = Code("id-1", "secret-code-long-enough-for-hmac");
        _secretProviderMock.Setup(x => x.GetValidationSecrets()).Returns([code]);
        var sut = CreateSut();

        // Hand-built envelope with no matching secret id.
        string envelope = JsonSerializer.Serialize(
            new SignedWorkflowState
            {
                Payload = Payload,
                Signature = Convert.ToBase64String(new byte[32]),
                SecretId = "",
            }
        );

        Assert.Throws<WorkflowCallbackStateException>(() => sut.Verify(envelope, SigningDomain.CallbackState));
    }

    [Fact]
    public void Verify_MalformedEnvelope_Throws()
    {
        var code = Code("id-1", "secret-code-long-enough-for-hmac");
        _secretProviderMock.Setup(x => x.GetValidationSecrets()).Returns([code]);
        var sut = CreateSut();

        Assert.Throws<WorkflowCallbackStateException>(() => sut.Verify("not json at all", SigningDomain.CallbackState));
    }

    [Fact]
    public void Verify_ExpiredSecretBeyondClockSkew_Throws()
    {
        var now = new DateTimeOffset(2025, 6, 1, 12, 0, 0, TimeSpan.Zero);
        // Signed while valid; verified after the code expired beyond the 5-minute skew.
        var signingCode = Code("id-1", "secret-code-long-enough-for-hmac", expiresAt: now.AddMinutes(-6));
        _secretProviderMock.Setup(x => x.GetSigningSecret()).Returns(signingCode);
        _secretProviderMock.Setup(x => x.GetValidationSecrets()).Returns([signingCode]);
        var sut = CreateSut(new FakeTimeProvider(now));

        string envelope = sut.Sign(Payload, SigningDomain.CallbackState);

        Assert.Throws<WorkflowCallbackStateException>(() => sut.Verify(envelope, SigningDomain.CallbackState));
    }

    [Fact]
    public void Verify_ExpiredSecretWithinClockSkew_Succeeds()
    {
        var now = new DateTimeOffset(2025, 6, 1, 12, 0, 0, TimeSpan.Zero);
        // Expired 4 minutes ago — inside the 5-minute clock skew, so still accepted.
        var signingCode = Code("id-1", "secret-code-long-enough-for-hmac", expiresAt: now.AddMinutes(-4));
        _secretProviderMock.Setup(x => x.GetSigningSecret()).Returns(signingCode);
        _secretProviderMock.Setup(x => x.GetValidationSecrets()).Returns([signingCode]);
        var sut = CreateSut(new FakeTimeProvider(now));

        string envelope = sut.Sign(Payload, SigningDomain.CallbackState);

        Assert.Equal(Payload, sut.Verify(envelope, SigningDomain.CallbackState));
    }

    [Fact]
    public void Verify_RotationOverlap_OldCodeStillValidates()
    {
        // Signed with the old code; by callback time a new code has been prepended (rotation), but the old
        // code is still mounted and not expired, so the blob still verifies.
        var oldCode = Code("id-old", "old-secret-code-long-enough-hmac");
        var newCode = Code("id-new", "new-secret-code-long-enough-hmac");
        _secretProviderMock.Setup(x => x.GetSigningSecret()).Returns(oldCode);
        _secretProviderMock.Setup(x => x.GetValidationSecrets()).Returns([newCode, oldCode]);
        var sut = CreateSut();

        string envelope = sut.Sign(Payload, SigningDomain.CallbackState);

        Assert.Equal(Payload, sut.Verify(envelope, SigningDomain.CallbackState));
    }

    [Fact]
    public void Verify_DifferentSecretSameId_Throws()
    {
        // Same id but a rotated secret value (an attacker cannot forge under a fresh secret).
        _secretProviderMock.Setup(x => x.GetSigningSecret()).Returns(Code("id-1", "original-secret-long-enough-ok"));
        _secretProviderMock
            .Setup(x => x.GetValidationSecrets())
            .Returns([Code("id-1", "rotated-secret-long-enough-ok")]);
        var sut = CreateSut();

        string envelope = sut.Sign(Payload, SigningDomain.CallbackState);

        Assert.Throws<WorkflowCallbackStateException>(() => sut.Verify(envelope, SigningDomain.CallbackState));
    }

    [Fact]
    public void Verify_NoSecretsConfigured_Throws()
    {
        _secretProviderMock
            .Setup(x => x.GetValidationSecrets())
            .Throws(new WorkflowCallbackSecretNotFoundException("no codes"));
        var sut = CreateSut();

        string envelope = JsonSerializer.Serialize(
            new SignedWorkflowState
            {
                Payload = Payload,
                Signature = Convert.ToBase64String(new byte[32]),
                SecretId = "id-1",
            }
        );

        Assert.Throws<WorkflowCallbackStateException>(() => sut.Verify(envelope, SigningDomain.CallbackState));
    }
}
