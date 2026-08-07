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
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Altinn.App.Clients.Fiks.Tests.FiksArkiv;

public class FiksArkivServiceTaskTest
{
    private static readonly Guid _workflowId = Guid.Parse("2f4bd7b5-19f0-4bd0-bd0c-9c7ec6f45a4a");
    private static readonly Guid _workflowStepId = Guid.Parse("9ec7e888-8f05-423c-a54c-572f36b121ef");
    private static readonly DateTimeOffset _executionReferenceTime = DateTimeOffset.Parse("2026-05-17T10:15:30+02:00");

    [Fact]
    public async Task Execute_CallsGenerateAndSendWithWorkflowMetadata_AndReturnsAutoAdvance()
    {
        var instance = CreateInstance();
        var dataMutator = InstanceDataMutatorMockFactory(instance);
        var host = new Mock<IFiksArkivHost>(MockBehavior.Strict);
        host.Setup(x =>
                x.GenerateAndSendMessage(
                    "Task_1",
                    "no.ks.fiks.arkiv.v1.arkivering.arkivmelding.opprett",
                    _workflowStepId,
                    _executionReferenceTime,
                    dataMutator.Object,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(TestHelpers.GetFiksIOMessageResponse())
            .Verifiable(Times.Once);

        await using var fixture = TestFixture.Create(services =>
        {
            services.AddFiksArkiv();
            services.AddSingleton(host.Object);
        });

        ServiceTaskResult result = await fixture.FiksArkivServiceTask.Execute(
            CreateContext(dataMutator.Object, _workflowStepId)
        );

        var successResult = Assert.IsType<ServiceTaskSuccessResult>(result);
        Assert.True(successResult.AutoAdvanceProcess);
        Assert.Null(successResult.Action);
        host.Verify();
    }

    [Fact]
    public async Task Execute_SameStepRetryUsesSameGuid_DifferentStepUsesDifferentGuid()
    {
        var instance = CreateInstance();
        var dataMutator = InstanceDataMutatorMockFactory(instance);
        var host = new Mock<IFiksArkivHost>(MockBehavior.Strict);
        var receivedReferences = new List<Guid>();
        host.Setup(x =>
                x.GenerateAndSendMessage(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<Guid>(),
                    It.IsAny<DateTimeOffset>(),
                    dataMutator.Object,
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback(
                (
                    string _,
                    string _,
                    Guid sendersReference,
                    DateTimeOffset _,
                    IInstanceDataMutator _,
                    CancellationToken _
                ) => receivedReferences.Add(sendersReference)
            )
            .ReturnsAsync(TestHelpers.GetFiksIOMessageResponse());

        await using var fixture = TestFixture.Create(services =>
        {
            services.AddFiksArkiv();
            services.AddSingleton(host.Object);
        });

        Guid laterWorkflowStepId = Guid.Parse("76aec9b6-ea01-41ed-bad2-828cdf7f2bb2");
        await fixture.FiksArkivServiceTask.Execute(CreateContext(dataMutator.Object, _workflowStepId));
        await fixture.FiksArkivServiceTask.Execute(CreateContext(dataMutator.Object, _workflowStepId));
        await fixture.FiksArkivServiceTask.Execute(CreateContext(dataMutator.Object, laterWorkflowStepId));

        Assert.Equal([_workflowStepId, _workflowStepId, laterWorkflowStepId], receivedReferences);
    }

    [Fact]
    public async Task Execute_WithRealHost_SameStepRetryUsesSameGuid_DifferentStepUsesDifferentGuid()
    {
        Guid recipientAccount = Guid.Parse("120ec76a-c73b-43f7-957b-1450422c32b3");
        Guid laterWorkflowStepId = Guid.Parse("76aec9b6-ea01-41ed-bad2-828cdf7f2bb2");
        var settings = new FiksArkivSettings
        {
            Receipt = new FiksArkivReceiptSettings
            {
                ArchiveRecord = new FiksArkivDataTypeSettings { DataType = "archive-record-type" },
                ConfirmationRecord = new FiksArkivDataTypeSettings { DataType = "confirmation-record-type" },
            },
            Recipient = new FiksArkivRecipientSettings
            {
                FiksAccount = new FiksArkivBindableValue<Guid?> { Value = recipientAccount },
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
        var primaryDocument = new DataElement
        {
            Id = "1d8728dd-35cb-4d09-8e45-e3dbb3b37ae7",
            DataType = "primary-document",
            ContentType = "application/pdf",
            Filename = "primary.pdf",
        };
        var instance = CreateInstance();
        instance.AppId = "ttd/unit-testing";
        instance.InstanceOwner = new InstanceOwner { PartyId = "12345" };
        instance.Data = [primaryDocument];
        var dataMutator = new Mock<IInstanceDataMutator>(MockBehavior.Strict);
        var fiksIOClient = new Mock<IFiksIOClient>(MockBehavior.Strict);
        var sentReferences = new List<Guid>();

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
        fiksIOClient
            .Setup(x => x.SendMessage(It.IsAny<FiksIOMessageRequest>(), It.IsAny<CancellationToken>()))
            .Callback(
                (FiksIOMessageRequest request, CancellationToken _) => sentReferences.Add(request.SendersReference)
            )
            .ReturnsAsync(TestHelpers.GetFiksIOMessageResponse());

        await using var fixture = TestFixture.Create(
            services =>
            {
                services.AddFiksArkiv().WithFiksArkivConfig("ComposedFiksArkivSettings");
                services.AddSingleton(fiksIOClient.Object);
            },
            [("ComposedFiksArkivSettings", settings)],
            useDefaultFiksArkivSettings: false
        );
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

        ServiceTaskResult[] results =
        [
            await fixture.FiksArkivServiceTask.Execute(CreateContext(dataMutator.Object, _workflowStepId)),
            await fixture.FiksArkivServiceTask.Execute(CreateContext(dataMutator.Object, _workflowStepId)),
            await fixture.FiksArkivServiceTask.Execute(CreateContext(dataMutator.Object, laterWorkflowStepId)),
        ];

        Assert.All(
            results,
            result => Assert.False(result is ServiceTaskFailedResult, (result as ServiceTaskFailedResult)?.ErrorMessage)
        );
        Assert.Equal([_workflowStepId, _workflowStepId, laterWorkflowStepId], sentReferences);
        fiksIOClient.Verify(
            x => x.SendMessage(It.IsAny<FiksIOMessageRequest>(), It.IsAny<CancellationToken>()),
            Times.Exactly(3)
        );
    }

    [Fact]
    public async Task Execute_InvalidWorkflowIdentity_ReturnsPermanentFailureWithoutHostOrMutatorSideEffects()
    {
        var dataMutator = new Mock<IInstanceDataMutator>(MockBehavior.Strict);
        var host = new Mock<IFiksArkivHost>(MockBehavior.Strict);
        await using var fixture = TestFixture.Create(services =>
        {
            services.AddFiksArkiv();
            services.AddSingleton(host.Object);
        });
        ServiceTaskResult result = await fixture.FiksArkivServiceTask.Execute(
            CreateContext(dataMutator.Object, Guid.Empty)
        );

        var failedResult = Assert.IsType<ServiceTaskFailedResult>(result);
        Assert.Equal(FailureKind.Permanent, failedResult.Kind);
        Assert.Contains("did not supply a step id", failedResult.ErrorMessage);
        host.VerifyNoOtherCalls();
        dataMutator.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Execute_FailedSend_WhenMoveToNextTask_ReturnsSuccessWithAction()
    {
        var settings = new FiksArkivSettings
        {
            ErrorHandling = new FiksArkivErrorHandlingSettings { MoveToNextTask = true, Action = "reject" },
        };
        var instance = CreateInstance();
        var dataMutator = InstanceDataMutatorMockFactory(instance);
        var host = FailingHostMockFactory();
        await using var fixture = TestFixture.Create(
            services =>
            {
                services.AddFiksArkiv().WithFiksArkivConfig("CustomFiksArkivSettings");
                services.AddSingleton(host.Object);
            },
            [("CustomFiksArkivSettings", settings)]
        );

        ServiceTaskResult result = await fixture.FiksArkivServiceTask.Execute(
            CreateContext(dataMutator.Object, _workflowStepId)
        );

        var successResult = Assert.IsType<ServiceTaskSuccessResult>(result);
        Assert.True(successResult.AutoAdvanceProcess);
        Assert.Equal("reject", successResult.Action);
        host.Verify();
    }

    [Fact]
    public async Task Execute_FailedSend_WhenNotMoveToNextTask_ReturnsRetryableFailure()
    {
        var settings = new FiksArkivSettings
        {
            ErrorHandling = new FiksArkivErrorHandlingSettings { MoveToNextTask = false },
        };
        var instance = CreateInstance();
        var dataMutator = InstanceDataMutatorMockFactory(instance);
        var host = FailingHostMockFactory();
        await using var fixture = TestFixture.Create(
            services =>
            {
                services.AddFiksArkiv().WithFiksArkivConfig("CustomFiksArkivSettings");
                services.AddSingleton(host.Object);
            },
            [("CustomFiksArkivSettings", settings)]
        );

        ServiceTaskResult result = await fixture.FiksArkivServiceTask.Execute(
            CreateContext(dataMutator.Object, _workflowStepId)
        );

        var failedResult = Assert.IsType<ServiceTaskFailedResult>(result);
        Assert.Equal(FailureKind.Retryable, failedResult.Kind);
        Assert.Equal("Fiks unavailable", failedResult.ErrorMessage);
        host.Verify();
    }

    private static Instance CreateInstance() =>
        new()
        {
            Id = "12345/27fde586-4078-4c16-8c5f-ec406f1b17de",
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = "Task_1" } },
        };

    private static ServiceTaskContext CreateContext(IInstanceDataMutator dataMutator, Guid workflowStepId) =>
        new()
        {
            InstanceDataMutator = dataMutator,
            WorkflowId = _workflowId,
            StepId = workflowStepId,
            ExecutionReferenceTime = _executionReferenceTime,
        };

    private static Mock<IInstanceDataMutator> InstanceDataMutatorMockFactory(Instance instance)
    {
        var dataMutator = new Mock<IInstanceDataMutator>(MockBehavior.Strict);
        dataMutator.Setup(x => x.Instance).Returns(instance);
        return dataMutator;
    }

    private static Mock<IFiksArkivHost> FailingHostMockFactory()
    {
        var host = new Mock<IFiksArkivHost>(MockBehavior.Strict);
        host.Setup(x =>
                x.GenerateAndSendMessage(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<Guid>(),
                    It.IsAny<DateTimeOffset>(),
                    It.IsAny<IInstanceDataMutator>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new TimeoutException("Fiks unavailable"))
            .Verifiable(Times.Once);
        return host;
    }
}
