using System;
using System.Collections.Generic;
using System.Text;
using System.Text.Json;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Infrastructure.Clients.Secrets;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Microsoft.Extensions.Time.Testing;
using Moq;
using Xunit;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

/// <summary>
/// The integrity envelope a forwarded message travels in: it must refuse anything signed for a
/// <em>different message</em> — another mailbox, another pipeline, another idempotency key, another sender — and
/// keep its signature domain disjoint from the callback state blob's.
/// </summary>
public class MailboxDeliveryEnvelopeTests
{
    private const string Body = """{"status":"mottatt","meldingId":"abc"}""";
    private const string TaskType = "archive";
    private const string Key = "fiks-message-42";

    private static readonly Guid _mailbox = new("018f4e00-0000-7000-8000-00000000ffaa");
    private static readonly Guid _otherMailbox = new("018f4e00-0000-7000-8000-00000000ffbb");
    private static readonly PipelineId _pipeline = PipelineId.ServiceTask(TaskType);
    private static readonly PipelineId _payPipeline = PipelineId.ActionPipeline(TaskType, "pay");
    private static readonly Actor _sender = new() { UserId = 1337, Language = "nb" };

    [Fact]
    public void WrapThenUnwrap_RoundTripsTheBodyUnchanged()
    {
        var envelope = TestMailboxDeliveryEnvelope.Create();

        string wrapped = envelope.Wrap(Body, _mailbox, _pipeline, Key, sender: null);

        Assert.NotEqual(Body, wrapped);
        Assert.Equal(new MailboxDelivery(Body, Sender: null), envelope.Unwrap(wrapped, _mailbox, _pipeline, Key));
    }

    [Fact]
    public void WrapThenUnwrap_RoundTripsTheSender()
    {
        var envelope = TestMailboxDeliveryEnvelope.Create();

        string wrapped = envelope.Wrap(Body, _mailbox, _payPipeline, Key, _sender);

        Assert.Equal(_sender, envelope.Unwrap(wrapped, _mailbox, _payPipeline, Key).Sender);
    }

    [Fact]
    public void WrapThenUnwrap_EmptyBody_RoundTripsAsAnEmptyBody()
    {
        var envelope = TestMailboxDeliveryEnvelope.Create();

        string wrapped = envelope.Wrap(string.Empty, _mailbox, _pipeline, Key, sender: null);

        Assert.NotEmpty(wrapped);
        Assert.Equal(string.Empty, envelope.Unwrap(wrapped, _mailbox, _pipeline, Key).Body);
    }

    [Fact]
    public void Unwrap_RawPayloadThatWasNeverWrapped_Throws()
    {
        var envelope = TestMailboxDeliveryEnvelope.Create();

        Assert.Throws<MailboxDeliveryEnvelopeException>(() => envelope.Unwrap(Body, _mailbox, _pipeline, Key));
    }

    [Fact]
    public void Unwrap_EmptyPayload_Throws()
    {
        var envelope = TestMailboxDeliveryEnvelope.Create();

        Assert.Throws<MailboxDeliveryEnvelopeException>(() => envelope.Unwrap(string.Empty, _mailbox, _pipeline, Key));
    }

    [Fact]
    public void Unwrap_BodyAlteredAfterWrapping_Throws()
    {
        var envelope = TestMailboxDeliveryEnvelope.Create();
        var wrapped = Signed(envelope.Wrap(Body, _mailbox, _pipeline, Key, sender: null));
        string tampered = JsonSerializer.Serialize(
            wrapped with
            {
                Payload = wrapped.Payload.Replace("mottatt", "kvittering", StringComparison.Ordinal),
            }
        );

        Assert.Throws<MailboxDeliveryEnvelopeException>(() => envelope.Unwrap(tampered, _mailbox, _pipeline, Key));
    }

    [Fact]
    public void Unwrap_SenderAlteredAfterWrapping_Throws()
    {
        var envelope = TestMailboxDeliveryEnvelope.Create();
        var wrapped = Signed(envelope.Wrap(Body, _mailbox, _payPipeline, Key, _sender));
        string tampered = JsonSerializer.Serialize(
            wrapped with
            {
                Payload = wrapped.Payload.Replace("1337", "1338", StringComparison.Ordinal),
            }
        );

        Assert.Throws<MailboxDeliveryEnvelopeException>(() => envelope.Unwrap(tampered, _mailbox, _payPipeline, Key));
    }

    [Fact]
    public void Unwrap_SignedByAnotherAppsCode_Throws()
    {
        string wrapped = TestMailboxDeliveryEnvelope
            .Create(code: "a-completely-different-callback-code")
            .Wrap(Body, _mailbox, _pipeline, Key, sender: null);

        Assert.Throws<MailboxDeliveryEnvelopeException>(() =>
            TestMailboxDeliveryEnvelope.Create().Unwrap(wrapped, _mailbox, _pipeline, Key)
        );
    }

    [Fact]
    public void Unwrap_EnvelopeDeliveredIntoADifferentMailbox_Throws()
    {
        var envelope = TestMailboxDeliveryEnvelope.Create();

        string wrapped = envelope.Wrap(Body, _mailbox, _pipeline, Key, sender: null);

        Assert.Throws<MailboxDeliveryEnvelopeException>(() => envelope.Unwrap(wrapped, _otherMailbox, _pipeline, Key));
    }

    [Theory]
    [InlineData("eFormidling", null)]
    [InlineData(TaskType, "pay")]
    [InlineData(TaskType, "")]
    public void Unwrap_EnvelopeReadByAnotherPipeline_Throws(string taskType, string? action)
    {
        // The case the mailbox binding alone misses: the address is unchanged, so Unwrap would otherwise
        // succeed for a receiver naming another pipeline's handler.
        var envelope = TestMailboxDeliveryEnvelope.Create();

        string wrapped = envelope.Wrap(Body, _mailbox, _pipeline, Key, sender: null);

        Assert.Throws<MailboxDeliveryEnvelopeException>(() =>
            envelope.Unwrap(wrapped, _mailbox, new PipelineId(taskType, action), Key)
        );
    }

    [Fact]
    public void Unwrap_EnvelopeRelabelledWithAnotherIdempotencyKey_Throws()
    {
        var envelope = TestMailboxDeliveryEnvelope.Create();

        string wrapped = envelope.Wrap(Body, _mailbox, _pipeline, Key, sender: null);

        Assert.Throws<MailboxDeliveryEnvelopeException>(() =>
            envelope.Unwrap(wrapped, _mailbox, _pipeline, "fiks-message-43")
        );
    }

    [Fact]
    public void Unwrap_EnvelopeSealedAsVersion1_Throws()
    {
        // Golden row 1 as the first envelope version signed it: the raw body, bound to the service task type only.
        string version1 = JsonSerializer.Serialize(
            new SignedWorkflowState
            {
                Payload = Body,
                Signature = "jZjFm/3SmMj7dJ1wdUYynHHoJxglxUZkFWz4dmwLIbA=",
                SecretId = TestMailboxDeliveryEnvelope.DefaultSecretId,
            }
        );

        Assert.Throws<MailboxDeliveryEnvelopeException>(() =>
            TestMailboxDeliveryEnvelope.Create(code: GoldenCode).Unwrap(version1, GoldenMailbox, _pipeline, Key)
        );
    }

    [Fact]
    public void Wrap_EachBoundValue_MovesTheSignatureOnItsOwn()
    {
        // The bindings live in the derived key, so the payload is byte-identical and only the signature moves.
        var envelope = TestMailboxDeliveryEnvelope.Create();

        var baseline = Signed(envelope.Wrap(Body, _mailbox, _pipeline, Key, sender: null));
        var otherMailbox = Signed(envelope.Wrap(Body, _otherMailbox, _pipeline, Key, sender: null));
        var otherHandler = Signed(envelope.Wrap(Body, _mailbox, PipelineId.ServiceTask("eFormidling"), Key, null));
        var otherAction = Signed(envelope.Wrap(Body, _mailbox, _payPipeline, Key, sender: null));
        var otherKey = Signed(envelope.Wrap(Body, _mailbox, _pipeline, "fiks-message-43", sender: null));

        Assert.Equal(baseline.Payload, otherMailbox.Payload);
        Assert.Equal(baseline.Payload, otherHandler.Payload);
        Assert.Equal(baseline.Payload, otherAction.Payload);
        Assert.Equal(baseline.Payload, otherKey.Payload);
        Assert.Equal(
            5,
            new HashSet<string>(StringComparer.Ordinal)
            {
                baseline.Signature,
                otherMailbox.Signature,
                otherHandler.Signature,
                otherAction.Signature,
                otherKey.Signature,
            }.Count
        );
    }

    [Fact]
    public void Wrap_BindingsAreDelimiterInjectionProof()
    {
        var envelope = TestMailboxDeliveryEnvelope.Create();

        string first = Signed(envelope.Wrap(Body, _mailbox, PipelineId.ServiceTask("a"), "b:c", null)).Signature;
        string second = Signed(envelope.Wrap(Body, _mailbox, PipelineId.ServiceTask("a:b"), "c", null)).Signature;
        string third = Signed(envelope.Wrap(Body, _mailbox, PipelineId.ActionPipeline("a", "b"), "c", null)).Signature;

        Assert.Equal(3, new HashSet<string>(StringComparer.Ordinal) { first, second, third }.Count);
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

        var wrapped = Signed(
            envelope.Wrap(Body, GoldenMailbox, PipelineId.ServiceTask("arkivOppgjør"), keyWithAstralChars, null)
        );

        Assert.Equal("pHt1hAuf2QlDVrJnPZ4SRy9veGpHKrddKWAZK+bV5rI=", wrapped.Signature);
    }

    [Fact]
    public void Unwrap_CallbackStateBlobPresentedAsADelivery_Throws()
    {
        // Without the purpose-derived key this would verify: same envelope shape, same code.
        string stateBlob = TestMailboxDeliveryEnvelope.CreateSigner().Sign(Body, SigningDomain.CallbackState);

        Assert.Throws<MailboxDeliveryEnvelopeException>(() =>
            TestMailboxDeliveryEnvelope.Create().Unwrap(stateBlob, _mailbox, _pipeline, Key)
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
            _pipeline,
            Key,
            sender: null
        );

        Assert.Throws<WorkflowCallbackStateException>(() =>
            signer.Verify(deliveryEnvelope, SigningDomain.CallbackState)
        );
    }

    private const string GoldenCode = "workflow-callback-code-0123456789";
    private static readonly Guid GoldenMailbox = new("018f4e00-0000-7000-8000-00000000ffaa");

    /// <summary>
    /// Known-answer vectors for the delivery envelope: secret, mailbox id, task type, action, idempotency key, body
    /// and sender's user id, then the signed content and the Base64 HMAC-SHA256 an independent implementation
    /// produces. Each signature is
    /// <c>HMAC(HMAC(code, "altinn:workflow-engine:mailbox-delivery:v2:{mailboxId:N}:{len}:{type}:{len|-1}:{action}:{len}:{key}"), content)</c>.
    /// Rows 2–7 differ from row 1 in <em>exactly one</em> value each, so every binding and the sender are pinned by
    /// a known answer rather than only by a differential test; row 6 is the empty action, which differs from none.
    /// Row 8 is an empty body, row 9 Norwegian text, row 10 the non-BMP case that makes the length-prefix unit
    /// visible, and row 11 a 65-byte code, one past HMAC-SHA256's block size where the key is hashed first.
    /// </summary>
    public static TheoryData<string, string, string, string?, string, string, int?, string, string> GoldenVectors =>
        new()
        {
            {
                GoldenCode,
                "018f4e00-0000-7000-8000-00000000ffaa",
                "archive",
                null,
                "fiks-message-42",
                Body,
                null,
                """{"body":"{\u0022status\u0022:\u0022mottatt\u0022,\u0022meldingId\u0022:\u0022abc\u0022}","sender":null}""",
                "na330Nwjj1Tt+7v1obbA14e3iSGk/jT0CMmEFYm0l+g="
            },
            {
                GoldenCode,
                "018f4e00-0000-7000-8000-00000000ffbb",
                "archive",
                null,
                "fiks-message-42",
                Body,
                null,
                """{"body":"{\u0022status\u0022:\u0022mottatt\u0022,\u0022meldingId\u0022:\u0022abc\u0022}","sender":null}""",
                "B0DbsiN3sz2tDYSwjpLu12RJO89FmZTdKceY0pOmWTQ="
            },
            {
                GoldenCode,
                "018f4e00-0000-7000-8000-00000000ffaa",
                "eFormidling",
                null,
                "fiks-message-42",
                Body,
                null,
                """{"body":"{\u0022status\u0022:\u0022mottatt\u0022,\u0022meldingId\u0022:\u0022abc\u0022}","sender":null}""",
                "oiCo1yUzCADAaNBP138bpHQgx5s/UoXZXqcaG6BDnR0="
            },
            {
                GoldenCode,
                "018f4e00-0000-7000-8000-00000000ffaa",
                "archive",
                null,
                "fiks-message-43",
                Body,
                null,
                """{"body":"{\u0022status\u0022:\u0022mottatt\u0022,\u0022meldingId\u0022:\u0022abc\u0022}","sender":null}""",
                "RbxEMpSpIaKcThq7FgSunNdxWQK1i4tU15mZpqqO7ys="
            },
            {
                GoldenCode,
                "018f4e00-0000-7000-8000-00000000ffaa",
                "archive",
                "pay",
                "fiks-message-42",
                Body,
                null,
                """{"body":"{\u0022status\u0022:\u0022mottatt\u0022,\u0022meldingId\u0022:\u0022abc\u0022}","sender":null}""",
                "z/wxLV6ngWHcG8svlDlpVoYSmzGvG3u4/bBMv52e8Zs="
            },
            {
                GoldenCode,
                "018f4e00-0000-7000-8000-00000000ffaa",
                "archive",
                "",
                "fiks-message-42",
                Body,
                null,
                """{"body":"{\u0022status\u0022:\u0022mottatt\u0022,\u0022meldingId\u0022:\u0022abc\u0022}","sender":null}""",
                "7GPI9r76hJzHp8zl8yie984Pzy7CxQZ5m5I0D5l6aLA="
            },
            {
                GoldenCode,
                "018f4e00-0000-7000-8000-00000000ffaa",
                "archive",
                null,
                "fiks-message-42",
                Body,
                1337,
                """{"body":"{\u0022status\u0022:\u0022mottatt\u0022,\u0022meldingId\u0022:\u0022abc\u0022}","sender":{"userId":1337,"language":"nb"}}""",
                "mO7z08QaviZ7uL207doWB4KaTtSvBiTJJHlTCDW6NP8="
            },
            {
                GoldenCode,
                "018f4e00-0000-7000-8000-00000000ffaa",
                "archive",
                null,
                "fiks-message-42",
                "",
                null,
                """{"body":"","sender":null}""",
                "5iA1by4+HWpDhTLGCbzzSAL5HWaZAPsQttb7SQTsHxU="
            },
            {
                GoldenCode,
                "018f4e00-0000-7000-8000-00000000ffaa",
                "archive",
                null,
                "fiks-message-42",
                """{"melding":"Blåbærsyltetøy æøå"}""",
                null,
                """{"body":"{\u0022melding\u0022:\u0022Bl\u00E5b\u00E6rsyltet\u00F8y \u00E6\u00F8\u00E5\u0022}","sender":null}""",
                "yrVJpzQMoM8Xoznc/AQaqgkHY8syuP+EYF7igV273eQ="
            },
            {
                // The only row whose *bound* fields are non-ASCII, and the one that makes the length-prefix unit
                // visible: "arkivOppgjør" is 12 chars but 13 UTF-8 bytes, and the key is 17 code points, 19 UTF-16
                // code units and 26 UTF-8 bytes. The prefixes written are 12 and 19 — String.Length.
                GoldenCode,
                "018f4e00-0000-7000-8000-00000000ffaa",
                "arkivOppgjør",
                null,
                "melding-æøå-42-🇳🇴",
                Body,
                null,
                """{"body":"{\u0022status\u0022:\u0022mottatt\u0022,\u0022meldingId\u0022:\u0022abc\u0022}","sender":null}""",
                "pHt1hAuf2QlDVrJnPZ4SRy9veGpHKrddKWAZK+bV5rI="
            },
            {
                // 65 bytes: one past the block size, so HMAC hashes the key first.
                "wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww",
                "018f4e00-0000-7000-8000-00000000ffaa",
                "archive",
                null,
                "fiks-message-42",
                Body,
                null,
                """{"body":"{\u0022status\u0022:\u0022mottatt\u0022,\u0022meldingId\u0022:\u0022abc\u0022}","sender":null}""",
                "RrJRoVin+FatYK510w+2YdEf3Bg9y8wwK1qxaSfKP30="
            },
        };

    [Theory]
    [MemberData(nameof(GoldenVectors))]
    public void Wrap_ReproducesTheKnownSignature(
        string code,
        string mailboxId,
        string taskType,
        string? action,
        string idempotencyKey,
        string body,
        int? senderUserId,
        string content,
        string expected
    )
    {
        var envelope = TestMailboxDeliveryEnvelope.Create(code: code);

        var wrapped = Signed(
            envelope.Wrap(
                body,
                new Guid(mailboxId),
                new PipelineId(taskType, action),
                idempotencyKey,
                Sender(senderUserId)
            )
        );

        Assert.Equal(content, wrapped.Payload);
        Assert.Equal(expected, wrapped.Signature);
    }

    [Theory]
    [MemberData(nameof(GoldenVectors))]
    public void Unwrap_AcceptsAnEnvelopeCarryingTheKnownSignature(
        string code,
        string mailboxId,
        string taskType,
        string? action,
        string idempotencyKey,
        string body,
        int? senderUserId,
        string content,
        string expected
    )
    {
        // An envelope another build produced — hand-built from the vector, not signed by this one.
        var envelope = TestMailboxDeliveryEnvelope.Create(code: code);

        string wrapped = JsonSerializer.Serialize(
            new SignedWorkflowState
            {
                Payload = content,
                Signature = expected,
                SecretId = TestMailboxDeliveryEnvelope.DefaultSecretId,
            }
        );

        Assert.Equal(
            new MailboxDelivery(body, Sender(senderUserId)),
            envelope.Unwrap(wrapped, new Guid(mailboxId), new PipelineId(taskType, action), idempotencyKey)
        );
    }

    private static Actor? Sender(int? userId) => userId is { } id ? new Actor { UserId = id, Language = "nb" } : null;

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
        private const string _content =
            """{"body":"{\u0022status\u0022:\u0022mottatt\u0022,\u0022meldingId\u0022:\u0022abc\u0022}","sender":null}""";
        private const string _signature = "na330Nwjj1Tt+7v1obbA14e3iSGk/jT0CMmEFYm0l+g=";

        private static readonly DateTimeOffset _now = new(2026, 6, 1, 12, 0, 0, TimeSpan.Zero);

        /// <summary>The envelope an earlier deployment forwarded, signed with the old code.</summary>
        private static string EnvelopeSignedWithTheOldCode() =>
            JsonSerializer.Serialize(
                new SignedWorkflowState
                {
                    Payload = _content,
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

            Assert.Equal(
                Body,
                envelope.Unwrap(EnvelopeSignedWithTheOldCode(), _address, PipelineId.ServiceTask(_taskType), _key).Body
            );
        }

        [Fact]
        public void ExpiredCodeBeyondClockSkew_Throws()
        {
            // Past the overlap: mounted but expired — the same rule the callback token validator applies.
            var envelope = EnvelopeWith(Code(OldSecretId, OldCode, _now.AddMinutes(-6)));

            Assert.Throws<MailboxDeliveryEnvelopeException>(() =>
                envelope.Unwrap(EnvelopeSignedWithTheOldCode(), _address, PipelineId.ServiceTask(_taskType), _key)
            );
        }

        [Fact]
        public void ExpiredCodeWithinClockSkew_Opens()
        {
            // Expired 4 minutes ago — inside the signer's 5-minute clock skew, so still accepted.
            var envelope = EnvelopeWith(Code(OldSecretId, OldCode, _now.AddMinutes(-4)));

            Assert.Equal(
                Body,
                envelope.Unwrap(EnvelopeSignedWithTheOldCode(), _address, PipelineId.ServiceTask(_taskType), _key).Body
            );
        }

        [Fact]
        public void CodeRotatedOutEntirely_Throws()
        {
            // No longer mounted at all; indistinguishable, deliberately, from a forged secret id.
            var envelope = EnvelopeWith(Code("id-new", NewCode, _now.AddDays(186)));

            Assert.Throws<MailboxDeliveryEnvelopeException>(() =>
                envelope.Unwrap(EnvelopeSignedWithTheOldCode(), _address, PipelineId.ServiceTask(_taskType), _key)
            );
        }

        [Fact]
        public void DifferentSecretUnderTheSameId_Throws()
        {
            // The id still resolves, but the secret behind it was rotated in place.
            var envelope = EnvelopeWith(Code(OldSecretId, NewCode, _now.AddDays(186)));

            Assert.Throws<MailboxDeliveryEnvelopeException>(() =>
                envelope.Unwrap(EnvelopeSignedWithTheOldCode(), _address, PipelineId.ServiceTask(_taskType), _key)
            );
        }
    }
}
