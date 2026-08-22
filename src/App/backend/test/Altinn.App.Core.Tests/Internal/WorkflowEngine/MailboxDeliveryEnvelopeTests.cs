using System;
using System.Collections.Generic;
using System.Text;
using System.Text.Json;
using Altinn.App.Core.Infrastructure.Clients.Secrets;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Microsoft.Extensions.Time.Testing;
using Moq;
using Xunit;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

/// <summary>
/// The integrity envelope a forwarded message travels in: it must round-trip a body unchanged, refuse
/// anything this app did not sign, refuse anything signed for a <em>different message</em> — another
/// mailbox, another handler, another idempotency key — and keep its signature domain disjoint from the
/// callback state blob's.
/// </summary>
public class MailboxDeliveryEnvelopeTests
{
    private const string Body = """{"status":"mottatt","meldingId":"abc"}""";
    private const string TaskType = "archive";
    private const string Key = "fiks-message-42";

    private static readonly Guid _mailbox = new("018f4e00-0000-7000-8000-00000000ffaa");
    private static readonly Guid _otherMailbox = new("018f4e00-0000-7000-8000-00000000ffbb");

    [Fact]
    public void WrapThenUnwrap_RoundTripsTheBodyUnchanged()
    {
        var envelope = TestMailboxDeliveryEnvelope.Create();

        string wrapped = envelope.Wrap(Body, _mailbox, TaskType, Key);

        Assert.NotEqual(Body, wrapped);
        Assert.Equal(Body, envelope.Unwrap(wrapped, _mailbox, TaskType, Key));
    }

    [Fact]
    public void WrapThenUnwrap_EmptyBody_RoundTripsAsAnEmptyBody()
    {
        var envelope = TestMailboxDeliveryEnvelope.Create();

        string wrapped = envelope.Wrap(string.Empty, _mailbox, TaskType, Key);

        Assert.NotEmpty(wrapped);
        Assert.Equal(string.Empty, envelope.Unwrap(wrapped, _mailbox, TaskType, Key));
    }

    [Fact]
    public void Unwrap_RawPayloadThatWasNeverWrapped_Throws()
    {
        var envelope = TestMailboxDeliveryEnvelope.Create();

        Assert.Throws<MailboxDeliveryEnvelopeException>(() => envelope.Unwrap(Body, _mailbox, TaskType, Key));
    }

    [Fact]
    public void Unwrap_EmptyPayload_Throws()
    {
        var envelope = TestMailboxDeliveryEnvelope.Create();

        Assert.Throws<MailboxDeliveryEnvelopeException>(() => envelope.Unwrap(string.Empty, _mailbox, TaskType, Key));
    }

    [Fact]
    public void Unwrap_BodyAlteredAfterWrapping_Throws()
    {
        var envelope = TestMailboxDeliveryEnvelope.Create();
        var wrapped = JsonSerializer.Deserialize<SignedWorkflowState>(envelope.Wrap(Body, _mailbox, TaskType, Key))!;
        string tampered = JsonSerializer.Serialize(
            wrapped with
            {
                Payload = """{"status":"kvittering","meldingId":"abc"}""",
            }
        );

        Assert.Throws<MailboxDeliveryEnvelopeException>(() => envelope.Unwrap(tampered, _mailbox, TaskType, Key));
    }

    [Fact]
    public void Unwrap_SignedByAnotherAppsCode_Throws()
    {
        string wrapped = TestMailboxDeliveryEnvelope
            .Create(code: "a-completely-different-callback-code")
            .Wrap(Body, _mailbox, TaskType, Key);

        Assert.Throws<MailboxDeliveryEnvelopeException>(() =>
            TestMailboxDeliveryEnvelope.Create().Unwrap(wrapped, _mailbox, TaskType, Key)
        );
    }

    [Fact]
    public void Unwrap_EnvelopeDeliveredIntoADifferentMailbox_Throws()
    {
        var envelope = TestMailboxDeliveryEnvelope.Create();

        string wrapped = envelope.Wrap(Body, _mailbox, TaskType, Key);

        Assert.Throws<MailboxDeliveryEnvelopeException>(() => envelope.Unwrap(wrapped, _otherMailbox, TaskType, Key));
    }

    [Fact]
    public void Unwrap_EnvelopeReadByAnotherHandler_Throws()
    {
        // The case the mailbox binding alone misses: the address is unchanged, so Unwrap would otherwise
        // succeed for a receiver naming another task's handler.
        var envelope = TestMailboxDeliveryEnvelope.Create();

        string wrapped = envelope.Wrap(Body, _mailbox, TaskType, Key);

        Assert.Throws<MailboxDeliveryEnvelopeException>(() => envelope.Unwrap(wrapped, _mailbox, "eFormidling", Key));
    }

    [Fact]
    public void Unwrap_EnvelopeRelabelledWithAnotherIdempotencyKey_Throws()
    {
        var envelope = TestMailboxDeliveryEnvelope.Create();

        string wrapped = envelope.Wrap(Body, _mailbox, TaskType, Key);

        Assert.Throws<MailboxDeliveryEnvelopeException>(() =>
            envelope.Unwrap(wrapped, _mailbox, TaskType, "fiks-message-43")
        );
    }

    [Fact]
    public void Wrap_EachBoundValue_MovesTheSignatureOnItsOwn()
    {
        // The bindings live in the derived key, so the payload is byte-identical and only the signature moves.
        var envelope = TestMailboxDeliveryEnvelope.Create();

        var baseline = Signed(envelope.Wrap(Body, _mailbox, TaskType, Key));
        var otherMailbox = Signed(envelope.Wrap(Body, _otherMailbox, TaskType, Key));
        var otherHandler = Signed(envelope.Wrap(Body, _mailbox, "eFormidling", Key));
        var otherKey = Signed(envelope.Wrap(Body, _mailbox, TaskType, "fiks-message-43"));

        Assert.Equal(baseline.Payload, otherMailbox.Payload);
        Assert.Equal(baseline.Payload, otherHandler.Payload);
        Assert.Equal(baseline.Payload, otherKey.Payload);
        Assert.Equal(
            4,
            new HashSet<string>(StringComparer.Ordinal)
            {
                baseline.Signature,
                otherMailbox.Signature,
                otherHandler.Signature,
                otherKey.Signature,
            }.Count
        );
    }

    [Fact]
    public void Wrap_BindingsAreDelimiterInjectionProof()
    {
        var envelope = TestMailboxDeliveryEnvelope.Create();

        string first = Signed(envelope.Wrap(Body, _mailbox, "a", "b:c")).Signature;
        string second = Signed(envelope.Wrap(Body, _mailbox, "a:b", "c")).Signature;

        Assert.NotEqual(first, second);
    }

    [Fact]
    public void Wrap_LengthPrefixesCountTheUnitTheValueIsWrittenIn()
    {
        // Uniquely decodable only if the prefix counts the unit the value is *written* in — String.Length,
        // UTF-16 code units. Pinned with a key whose code-unit, code-point and byte counts all differ.
        var envelope = TestMailboxDeliveryEnvelope.Create(code: "workflow-callback-code-0123456789");
        const string keyWithAstralChars = "melding-æøå-42-🇳🇴";

        // 19 UTF-16 code units, 17 code points, 26 UTF-8 bytes — three different answers.
        Assert.Equal(19, keyWithAstralChars.Length);
        Assert.Equal(26, Encoding.UTF8.GetByteCount(keyWithAstralChars));

        var wrapped = Signed(envelope.Wrap(Body, GoldenMailbox, "arkivOppgjør", keyWithAstralChars));

        Assert.Equal("9SoHi4cewsr7bsSxmJCpf8gAL6dOq7yxFxdS/aHc++g=", wrapped.Signature);
    }

    [Fact]
    public void Wrap_DoesNotSignUnderTheWorkflowIdAddressDomainsTag()
    {
        // Re-derived for the mailbox address, not carried over: the earlier design's tag string produces a
        // different signature for the same inputs, so re-pointing the purpose at it fails every vector.
        var envelope = TestMailboxDeliveryEnvelope.Create(code: GoldenCode);

        string actual = Signed(envelope.Wrap(Body, GoldenMailbox, TaskType, Key)).Signature;

        Assert.Equal("jZjFm/3SmMj7dJ1wdUYynHHoJxglxUZkFWz4dmwLIbA=", actual);
        Assert.NotEqual("2CeLiuRVOESW3HzhSXLVRLWwbcBHi4GSFdCtVqaKOhA=", actual);
    }

    [Fact]
    public void Unwrap_CallbackStateBlobPresentedAsADelivery_Throws()
    {
        // Without the purpose-derived key this would verify: same envelope shape, same code.
        string stateBlob = TestMailboxDeliveryEnvelope.CreateSigner().Sign(Body, SigningDomain.CallbackState);

        Assert.Throws<MailboxDeliveryEnvelopeException>(() =>
            TestMailboxDeliveryEnvelope.Create().Unwrap(stateBlob, _mailbox, TaskType, Key)
        );
    }

    [Fact]
    public void Verify_DeliveryEnvelopePresentedAsACallbackStateBlob_Throws()
    {
        // The direction that matters most: without the derived key, anyone able to have a message forwarded
        // could obtain a valid app signature over bytes of their choosing and present it as a state blob.
        var signer = TestMailboxDeliveryEnvelope.CreateSigner();
        string deliveryEnvelope = new MailboxDeliveryEnvelope(signer).Wrap(
            """{"instance":{"id":"501337/abc"}}""",
            _mailbox,
            TaskType,
            Key
        );

        Assert.Throws<WorkflowCallbackStateException>(() =>
            signer.Verify(deliveryEnvelope, SigningDomain.CallbackState)
        );
    }

    private const string GoldenCode = "workflow-callback-code-0123456789";
    private static readonly Guid GoldenMailbox = new("018f4e00-0000-7000-8000-00000000ffaa");

    /// <summary>
    /// Known-answer vectors for the delivery envelope's signature: secret, mailbox id, service task type,
    /// idempotency key, body, and the Base64 HMAC-SHA256 an independent implementation produces. Each is
    /// <c>HMAC(HMAC(code, "altinn:workflow-engine:mailbox-delivery:v1:{mailboxId:N}:{len}:{type}:{len}:{key}"), body)</c>.
    /// Rows 2–4 differ from row 1 in <em>exactly one</em> bound value each, so every binding is pinned by a known
    /// answer rather than only by a differential test. Row 5 is an empty body, row 6 Norwegian text, row 7 the
    /// non-BMP case that makes the length-prefix unit visible, and row 8 a 65-byte code, one past HMAC-SHA256's
    /// block size where the key is hashed first.
    /// </summary>
    public static TheoryData<string, string, string, string, string, string> GoldenVectors =>
        new()
        {
            {
                GoldenCode,
                "018f4e00-0000-7000-8000-00000000ffaa",
                "archive",
                "fiks-message-42",
                """{"status":"mottatt","meldingId":"abc"}""",
                "jZjFm/3SmMj7dJ1wdUYynHHoJxglxUZkFWz4dmwLIbA="
            },
            {
                // Mailbox differs, nothing else.
                GoldenCode,
                "018f4e00-0000-7000-8000-00000000ffbb",
                "archive",
                "fiks-message-42",
                """{"status":"mottatt","meldingId":"abc"}""",
                "DZ6IV8Qv9kLPDODd13MuEvzyse8GfYkvLZEc0oGJyq4="
            },
            {
                // Service task type differs, nothing else.
                GoldenCode,
                "018f4e00-0000-7000-8000-00000000ffaa",
                "eFormidling",
                "fiks-message-42",
                """{"status":"mottatt","meldingId":"abc"}""",
                "6RFGYzSUYU+Z7u4EH6aSYe7dcQRKRAIvt9/vdSAxdzo="
            },
            {
                // Idempotency key differs, nothing else.
                GoldenCode,
                "018f4e00-0000-7000-8000-00000000ffaa",
                "archive",
                "fiks-message-43",
                """{"status":"mottatt","meldingId":"abc"}""",
                "TTTlhGmaVEmFCGiUDntEIJSj6xhQUF0Y5Lv7iPgBEoA="
            },
            {
                GoldenCode,
                "018f4e00-0000-7000-8000-00000000ffaa",
                "archive",
                "fiks-message-42",
                "",
                "ZYzUkVeCfq/JOQacRZkqbxXyjIbTngIFG90f03VRmsA="
            },
            {
                GoldenCode,
                "018f4e00-0000-7000-8000-00000000ffaa",
                "archive",
                "fiks-message-42",
                """{"melding":"Blåbærsyltetøy æøå"}""",
                "ncFbzh4Trzg70rY7TYJqah5X7b8+19OFEHfiG5J58tc="
            },
            {
                // The only row whose *bound* fields are non-ASCII, and the one that makes the length-prefix unit
                // visible: "arkivOppgjør" is 12 chars but 13 UTF-8 bytes, and the key is 17 code points, 19 UTF-16
                // code units and 26 UTF-8 bytes. The prefixes written are 12 and 19 — String.Length.
                GoldenCode,
                "018f4e00-0000-7000-8000-00000000ffaa",
                "arkivOppgjør",
                "melding-æøå-42-🇳🇴",
                """{"status":"mottatt","meldingId":"abc"}""",
                "9SoHi4cewsr7bsSxmJCpf8gAL6dOq7yxFxdS/aHc++g="
            },
            {
                // 65 bytes: one past the block size, so HMAC hashes the key first.
                "wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww",
                "018f4e00-0000-7000-8000-00000000ffaa",
                "archive",
                "fiks-message-42",
                """{"status":"mottatt","meldingId":"abc"}""",
                "szY6Xq8K/aj/6qz1gcdLIfzt6itVqY0fouTs67d3vD0="
            },
        };

    [Theory]
    [MemberData(nameof(GoldenVectors))]
    public void Wrap_ReproducesTheKnownSignature(
        string code,
        string mailboxId,
        string serviceTaskType,
        string idempotencyKey,
        string body,
        string expected
    )
    {
        var envelope = TestMailboxDeliveryEnvelope.Create(code: code);

        var wrapped = Signed(envelope.Wrap(body, new Guid(mailboxId), serviceTaskType, idempotencyKey));

        Assert.Equal(expected, wrapped.Signature);
    }

    [Theory]
    [MemberData(nameof(GoldenVectors))]
    public void Unwrap_AcceptsAnEnvelopeCarryingTheKnownSignature(
        string code,
        string mailboxId,
        string serviceTaskType,
        string idempotencyKey,
        string body,
        string expected
    )
    {
        // An envelope another build produced — hand-built from the vector, not signed by this one.
        var envelope = TestMailboxDeliveryEnvelope.Create(code: code);

        string wrapped = JsonSerializer.Serialize(
            new SignedWorkflowState
            {
                Payload = body,
                Signature = expected,
                SecretId = TestMailboxDeliveryEnvelope.DefaultSecretId,
            }
        );

        Assert.Equal(body, envelope.Unwrap(wrapped, new Guid(mailboxId), serviceTaskType, idempotencyKey));
    }

    private static SignedWorkflowState Signed(string envelopeJson) =>
        JsonSerializer.Deserialize<SignedWorkflowState>(envelopeJson)!;

    /// <summary>
    /// The code-rotation window. The fixtures are the golden vector's first row, hand-built rather than signed
    /// in-test — the secret provider is a strict mock with no <c>GetSigningSecret</c> setup, so nothing here
    /// could have been signed in-test even by accident.
    /// </summary>
    public sealed class RotationWindow
    {
        private const string OldCode = "workflow-callback-code-0123456789";
        private const string NewCode = "workflow-callback-code-9876543210";
        private const string OldSecretId = "id-old";

        private static readonly Guid _address = new("018f4e00-0000-7000-8000-00000000ffaa");
        private const string _taskType = "archive";
        private const string _key = "fiks-message-42";
        private const string _body = """{"status":"mottatt","meldingId":"abc"}""";
        private const string _signature = "jZjFm/3SmMj7dJ1wdUYynHHoJxglxUZkFWz4dmwLIbA=";

        private static readonly DateTimeOffset _now = new(2026, 6, 1, 12, 0, 0, TimeSpan.Zero);

        /// <summary>The envelope an earlier deployment forwarded, signed with the old code.</summary>
        private static string EnvelopeSignedWithTheOldCode() =>
            JsonSerializer.Serialize(
                new SignedWorkflowState
                {
                    Payload = _body,
                    Signature = _signature,
                    SecretId = OldSecretId,
                }
            );

        private static MailboxDeliveryEnvelope EnvelopeWith(params AppCode[] mounted)
        {
            var secretProvider = new Mock<IWorkflowCallbackSecretProvider>(MockBehavior.Strict);
            secretProvider.Setup(x => x.GetValidationSecrets()).Returns(mounted);

            return new MailboxDeliveryEnvelope(
                new WorkflowStateSigner(secretProvider.Object, new FakeTimeProvider(_now))
            );
        }

        private static AppCode Code(string id, string code, DateTimeOffset expiresAt) =>
            new()
            {
                Id = id,
                Code = code,
                IssuedAt = _now.AddDays(-200),
                ExpiresAt = expiresAt,
            };

        [Fact]
        public void OldButStillMountedCode_Opens()
        {
            // The overlap that makes rotation safe: the old code is still mounted and unexpired.
            var envelope = EnvelopeWith(
                Code("id-new", NewCode, _now.AddDays(186)),
                Code(OldSecretId, OldCode, _now.AddDays(30))
            );

            Assert.Equal(_body, envelope.Unwrap(EnvelopeSignedWithTheOldCode(), _address, _taskType, _key));
        }

        [Fact]
        public void ExpiredCodeBeyondClockSkew_Throws()
        {
            // Past the overlap: mounted but expired — the same rule the callback token validator applies.
            var envelope = EnvelopeWith(Code(OldSecretId, OldCode, _now.AddMinutes(-6)));

            Assert.Throws<MailboxDeliveryEnvelopeException>(() =>
                envelope.Unwrap(EnvelopeSignedWithTheOldCode(), _address, _taskType, _key)
            );
        }

        [Fact]
        public void ExpiredCodeWithinClockSkew_Opens()
        {
            // Expired 4 minutes ago — inside the signer's 5-minute clock skew, so still accepted.
            var envelope = EnvelopeWith(Code(OldSecretId, OldCode, _now.AddMinutes(-4)));

            Assert.Equal(_body, envelope.Unwrap(EnvelopeSignedWithTheOldCode(), _address, _taskType, _key));
        }

        [Fact]
        public void CodeRotatedOutEntirely_Throws()
        {
            // No longer mounted at all; indistinguishable, deliberately, from a forged secret id.
            var envelope = EnvelopeWith(Code("id-new", NewCode, _now.AddDays(186)));

            Assert.Throws<MailboxDeliveryEnvelopeException>(() =>
                envelope.Unwrap(EnvelopeSignedWithTheOldCode(), _address, _taskType, _key)
            );
        }

        [Fact]
        public void DifferentSecretUnderTheSameId_Throws()
        {
            // The id still resolves, but the secret behind it was rotated in place.
            var envelope = EnvelopeWith(Code(OldSecretId, NewCode, _now.AddDays(186)));

            Assert.Throws<MailboxDeliveryEnvelopeException>(() =>
                envelope.Unwrap(EnvelopeSignedWithTheOldCode(), _address, _taskType, _key)
            );
        }
    }
}
