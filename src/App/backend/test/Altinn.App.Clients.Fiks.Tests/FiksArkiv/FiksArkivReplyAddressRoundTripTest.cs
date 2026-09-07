using System.Text.Json;
using Altinn.App.Clients.Fiks.Constants;
using Altinn.App.Clients.Fiks.Extensions;
using Altinn.App.Clients.Fiks.FiksArkiv;
using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Clients.Fiks.FiksIO;
using Altinn.App.Clients.Fiks.FiksIO.Models;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models;
using Altinn.App.Tests.Common.Auth;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using KS.Fiks.Arkiv.Models.V1.Meldingstyper;
using KS.Fiks.IO.Client.Models;
using KS.Fiks.IO.Client.Send;
using KS.Fiks.IO.Crypto.Models;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Altinn.App.Clients.Fiks.Tests.FiksArkiv;

/// <summary>
/// The reply address end to end: the value the send stage publishes, and the mailbox the echoing answer is
/// delivered into.
/// </summary>
/// <remarks>
/// Deliberately not a hand-written echo: the test takes the wire value off the <em>real</em> outbound
/// request and hands it back as the received correlation id. Swapping the two send identities still passes
/// through a hand-built echo; here it routes the answer to the wrong address. The received
/// <c>klientMeldingId</c> is a third value, so reading the wrong field fails on the value, not a null.
/// </remarks>
public class FiksArkivReplyAddressRoundTripTest
{
    private static readonly Guid _mailboxId = Guid.Parse("c0ffee11-1111-4a1a-9c3d-4d5e6f708192");
    private static readonly Guid _workflowStepId = Guid.Parse("9ec7e888-8f05-423c-a54c-572f36b121ef");
    private static readonly Guid _archivesOwnReference = Guid.Parse("3b1d9d0e-77a2-4a1c-8f6a-8c2b1f9d5e44");
    private static readonly Guid _incomingMessageId = Guid.Parse("18b6b0b3-9a4e-4b2a-9e2f-9b1a5e2d4c11");
    private static readonly Guid _senderAccount = Guid.Parse("9f5f0c6e-3a4b-4d6f-9d1e-7c8b5a2e0f31");
    private static readonly DateTimeOffset _executionReferenceTime = DateTimeOffset.Parse("2026-05-17T10:15:30+02:00");

    [Fact]
    public async Task TheAddressTheSendPublishes_IsTheMailboxTheEchoedAnswerIsDeliveredTo()
    {
        var sentRequests = new List<FiksIOMessageRequest>();
        var forwarded = new List<(Guid MailboxId, string ServiceTaskType, string Payload, string IdempotencyKey)>();
        var forwarder = new Mock<IServiceTaskReplyForwarder>(MockBehavior.Strict);
        forwarder
            .Setup(x =>
                x.ForwardReply(
                    It.IsAny<Guid>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback(
                (Guid mailboxId, string serviceTaskType, string payload, string idempotencyKey, CancellationToken _) =>
                    forwarded.Add((mailboxId, serviceTaskType, payload, idempotencyKey))
            )
            .Returns(Task.CompletedTask);

        var fiksIOClient = new Mock<IFiksIOClient>(MockBehavior.Strict);
        fiksIOClient
            .Setup(x => x.SendMessage(It.IsAny<FiksIOMessageRequest>(), It.IsAny<CancellationToken>()))
            .Callback((FiksIOMessageRequest request, CancellationToken _) => sentRequests.Add(request))
            .ReturnsAsync(TestHelpers.GetFiksIOMessageResponse());

        var primaryDocument = new DataElement
        {
            Id = "1d8728dd-35cb-4d09-8e45-e3dbb3b37ae7",
            DataType = "primary-document",
            ContentType = "application/pdf",
            Filename = "primary.pdf",
        };
        var instance = CreateInstance(primaryDocument);
        var dataMutator = CreateDataMutator(instance, primaryDocument);

        await using var fixture = TestFixture.Create(
            services =>
            {
                services.AddFiksArkiv().WithFiksArkivConfig("ComposedFiksArkivSettings");
                services.AddSingleton(fiksIOClient.Object);
                services.AddSingleton(forwarder.Object);
            },
            [("ComposedFiksArkivSettings", ComposedSettings())],
            useDefaultFiksArkivSettings: false
        );
        PrepareForPayloadGeneration(fixture, dataMutator);

        // 1. The send stage publishes the mailbox id as the reply address.
        var sendStage = Assert.IsType<ServiceTaskStage.MailboxOpening>(fixture.FiksArkivPipeline.Items[0]);
        ServiceTaskOpeningStageResult sendResult = await sendStage.Work(
            CreateSendContext(dataMutator.Object),
            new ServiceTaskMailbox { Id = _mailboxId, Deadline = _executionReferenceTime + TimeSpan.FromDays(7) }
        );

        Assert.IsType<CompletedServiceTaskOpeningStageResult>(sendResult);
        FiksIOMessageRequest sent = Assert.Single(sentRequests);
        Assert.Equal(_workflowStepId, sent.SendersReference);
        Assert.Equal(_mailboxId.ToString(), sent.CorrelationId);

        // 2. Take the wire value the Fiks IO client would actually transmit, and echo exactly that back.
        MeldingRequest wire = sent.ToMeldingRequest(_senderAccount);
        Assert.Equal(_workflowStepId, wire.KlientMeldingId);
        Assert.NotNull(wire.KlientKorrelasjonsId);

        var mottattMelding = new Mock<IMottattMelding>(MockBehavior.Loose);
        mottattMelding.Setup(x => x.KlientKorrelasjonsId).Returns(wire.KlientKorrelasjonsId);
        mottattMelding.Setup(x => x.KlientMeldingId).Returns(_archivesOwnReference);
        mottattMelding.Setup(x => x.MeldingId).Returns(_incomingMessageId);
        mottattMelding.Setup(x => x.MeldingType).Returns(FiksArkivMeldingtype.ArkivmeldingOpprettKvittering);
        mottattMelding.Setup(x => x.HasPayload).Returns(true);
        mottattMelding
            .Setup(x => x.DecryptedPayloads)
            .ReturnsAsync([new StreamPayload(Stream.Null, "arkivmelding-kvittering.xml")]);
        var svarSender = new Mock<ISvarSender>();

        // 3. The real subscriber routes on what the archive echoed.
        await fixture.FiksArkivSubscriber.IncomingMessageListener(
            new FiksIOReceivedMessage(new MottattMeldingArgs(mottattMelding.Object, svarSender.Object))
        );

        var delivery = Assert.Single(forwarded);
        Assert.Equal(_mailboxId, delivery.MailboxId);
        Assert.NotEqual(_workflowStepId, delivery.MailboxId);
        Assert.NotEqual(_archivesOwnReference, delivery.MailboxId);
        // Compared against the task's own Type: the envelope binds this value, so a subscriber naming another
        // handler produces a message the waiting task refuses to open.
        Assert.Equal(fixture.FiksArkivServiceTask.Type, delivery.ServiceTaskType);
        Assert.Equal(_incomingMessageId.ToString(), delivery.IdempotencyKey);

        // 4. And the body is the message the reply handler reads back.
        StoredFiksArkivMessage? stored = JsonSerializer.Deserialize<StoredFiksArkivMessage>(delivery.Payload);
        Assert.NotNull(stored);
        Assert.Equal(_incomingMessageId, stored.MessageId);
        Assert.Equal(FiksArkivMeldingtype.ArkivmeldingOpprettKvittering, stored.MessageType);
        Assert.Equal(_archivesOwnReference, stored.SendersReference);
        Assert.Equal(_mailboxId.ToString(), stored.CorrelationId);

        svarSender.Verify(x => x.AckAsync(), Times.Once);
        svarSender.Verify(x => x.NackWithRequeueAsync(), Times.Never);
    }

    private static FiksArkivSettings ComposedSettings() =>
        new()
        {
            Receipt = new FiksArkivReceiptSettings
            {
                ArchiveRecord = new FiksArkivDataTypeSettings { DataType = "archive-record-type" },
                ConfirmationRecord = new FiksArkivDataTypeSettings { DataType = "confirmation-record-type" },
            },
            Recipient = new FiksArkivRecipientSettings
            {
                FiksAccount = new FiksArkivBindableValue<Guid?>
                {
                    Value = Guid.Parse("120ec76a-c73b-43f7-957b-1450422c32b3"),
                },
                Identifier = new FiksArkivBindableValue<string> { Value = "recipient-id" },
                Name = new FiksArkivBindableValue<string> { Value = "Recipient Name" },
                OrganizationNumber = new FiksArkivBindableValue<string> { Value = "123456789" },
            },
            Documents = new FiksArkivDocumentSettings
            {
                PrimaryDocument = new FiksArkivDataTypeSettings
                {
                    DataType = "primary-document",
                    Filename = "primary.pdf",
                },
                Attachments = [],
            },
            ErrorHandling = new FiksArkivErrorHandlingSettings { MoveToNextTask = false },
        };

    private static Instance CreateInstance(DataElement primaryDocument) =>
        new()
        {
            Id = "12345/27fde586-4078-4c16-8c5f-ec406f1b17de",
            AppId = "ttd/unit-testing",
            InstanceOwner = new InstanceOwner { PartyId = "12345" },
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
            Data = [primaryDocument],
        };

    private static Mock<IInstanceDataMutator> CreateDataMutator(Instance instance, DataElement primaryDocument)
    {
        var dataMutator = new Mock<IInstanceDataMutator>(MockBehavior.Strict);
        dataMutator.Setup(x => x.Instance).Returns(instance);
        dataMutator.Setup(x => x.TaskId).Returns("Task_1");
        dataMutator.Setup(x => x.Language).Returns((string?)null);
        dataMutator.Setup(x => x.GetBinaryData(primaryDocument)).ReturnsAsync("primary-data"u8.ToArray());
        dataMutator
            .Setup(x =>
                x.AddBinaryDataElement(
                    "archive-record-type",
                    "application/xml",
                    "archive-record-type.xml",
                    It.IsAny<ReadOnlyMemory<byte>>(),
                    "Task_1",
                    It.IsAny<List<KeyValueEntry>?>()
                )
            )
            .Returns((BinaryDataChange)null!);
        return dataMutator;
    }

    private static void PrepareForPayloadGeneration(TestFixture fixture, Mock<IInstanceDataMutator> dataMutator)
    {
        fixture
            .AppMetadataMock.Setup(x => x.GetApplicationMetadata())
            .ReturnsAsync(
                new ApplicationMetadata("ttd/unit-testing")
                {
                    Title = new Dictionary<string, string?> { ["nb"] = "Unit testing" },
                }
            );
        fixture
            .AuthenticationContextMock.Setup(x => x.Current)
            .Returns(TestAuthentication.GetServiceOwnerAuthentication());
        fixture.PartyClientMock.Setup(x => x.GetParty(12345, null)).ReturnsAsync((Party?)null);
        fixture
            .LayoutStateInitializerMock.Setup(x => x.Init(dataMutator.Object, "Task_1", null, null))
            .ReturnsAsync(
                new LayoutEvaluatorState(
                    dataMutator.Object,
                    null,
                    fixture.TranslationServiceMock.Object,
                    new FrontEndSettings()
                )
            );
    }

    private static ServiceTaskContext CreateSendContext(IInstanceDataMutator dataMutator) =>
        new()
        {
            InstanceDataMutator = dataMutator,
            WorkflowId = Guid.Parse("2f4bd7b5-19f0-4bd0-bd0c-9c7ec6f45a4a"),
            StepId = _workflowStepId,
            ExecutionReferenceTime = _executionReferenceTime,
        };
}
