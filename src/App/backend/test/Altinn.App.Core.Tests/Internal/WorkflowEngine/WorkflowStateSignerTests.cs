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

    [Fact]
    public void SignThenVerify_RoundTrips_ReturnsOriginalPayload()
    {
        var code = Code("id-1", "secret-code-long-enough-for-hmac");
        _secretProviderMock.Setup(x => x.GetSigningSecret()).Returns(code);
        _secretProviderMock.Setup(x => x.GetValidationSecrets()).Returns([code]);
        var sut = CreateSut();

        string envelope = sut.Sign(Payload);
        string restored = sut.Verify(envelope);

        Assert.Equal(Payload, restored);
    }

    [Fact]
    public void Sign_ProducesEnvelopeWithSecretIdAndExactPayload()
    {
        var code = Code("id-1", "secret-code-long-enough-for-hmac");
        _secretProviderMock.Setup(x => x.GetSigningSecret()).Returns(code);
        var sut = CreateSut();

        string envelopeJson = sut.Sign(Payload);
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

        var envelope = JsonSerializer.Deserialize<SignedWorkflowState>(sut.Sign(Payload))!;
        // Keep the original (valid) signature but swap in a different payload.
        string tampered = JsonSerializer.Serialize(
            envelope with
            {
                Payload = """{"instance":{"id":"501337/EVIL"},"formData":[]}""",
            }
        );

        Assert.Throws<WorkflowCallbackStateException>(() => sut.Verify(tampered));
    }

    [Fact]
    public void Verify_TamperedSignature_Throws()
    {
        var code = Code("id-1", "secret-code-long-enough-for-hmac");
        _secretProviderMock.Setup(x => x.GetSigningSecret()).Returns(code);
        _secretProviderMock.Setup(x => x.GetValidationSecrets()).Returns([code]);
        var sut = CreateSut();

        var envelope = JsonSerializer.Deserialize<SignedWorkflowState>(sut.Sign(Payload))!;
        // Valid Base64 of the wrong length/content — must be rejected, not throw on decode.
        string tampered = JsonSerializer.Serialize(envelope with { Signature = Convert.ToBase64String(new byte[32]) });

        Assert.Throws<WorkflowCallbackStateException>(() => sut.Verify(tampered));
    }

    [Fact]
    public void Verify_MalformedBase64Signature_Throws()
    {
        var code = Code("id-1", "secret-code-long-enough-for-hmac");
        _secretProviderMock.Setup(x => x.GetSigningSecret()).Returns(code);
        _secretProviderMock.Setup(x => x.GetValidationSecrets()).Returns([code]);
        var sut = CreateSut();

        var envelope = JsonSerializer.Deserialize<SignedWorkflowState>(sut.Sign(Payload))!;
        string tampered = JsonSerializer.Serialize(envelope with { Signature = "!!!not-base64!!!" });

        Assert.Throws<WorkflowCallbackStateException>(() => sut.Verify(tampered));
    }

    [Fact]
    public void Verify_UnknownSecretId_Throws()
    {
        var signingCode = Code("id-1", "secret-code-long-enough-for-hmac");
        _secretProviderMock.Setup(x => x.GetSigningSecret()).Returns(signingCode);
        // Validation set has a different id only.
        _secretProviderMock.Setup(x => x.GetValidationSecrets()).Returns([Code("id-other", "other-code-long-enough")]);
        var sut = CreateSut();

        string envelope = sut.Sign(Payload);

        Assert.Throws<WorkflowCallbackStateException>(() => sut.Verify(envelope));
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

        Assert.Throws<WorkflowCallbackStateException>(() => sut.Verify(envelope));
    }

    [Fact]
    public void Verify_MalformedEnvelope_Throws()
    {
        var code = Code("id-1", "secret-code-long-enough-for-hmac");
        _secretProviderMock.Setup(x => x.GetValidationSecrets()).Returns([code]);
        var sut = CreateSut();

        Assert.Throws<WorkflowCallbackStateException>(() => sut.Verify("not json at all"));
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

        string envelope = sut.Sign(Payload);

        Assert.Throws<WorkflowCallbackStateException>(() => sut.Verify(envelope));
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

        string envelope = sut.Sign(Payload);

        Assert.Equal(Payload, sut.Verify(envelope));
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

        string envelope = sut.Sign(Payload);

        Assert.Equal(Payload, sut.Verify(envelope));
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

        string envelope = sut.Sign(Payload);

        Assert.Throws<WorkflowCallbackStateException>(() => sut.Verify(envelope));
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

        Assert.Throws<WorkflowCallbackStateException>(() => sut.Verify(envelope));
    }
}
