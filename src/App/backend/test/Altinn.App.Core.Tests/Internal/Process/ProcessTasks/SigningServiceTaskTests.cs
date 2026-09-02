using System.Text.Json;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Features.Signing.Services;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process.ProcessTasks;

public class SigningServiceTaskTests
{
    private static readonly Guid _mailboxId = Guid.Parse("c0ffee11-1111-4a1a-9c3d-4d5e6f708192");
    private static readonly DateTimeOffset _deadline = DateTimeOffset.Parse("2026-09-16T10:15:30+02:00");

    private readonly Mock<IProcessReader> _processReaderMock = new(MockBehavior.Strict);
    private readonly Mock<ISigningService> _signingServiceMock = new(MockBehavior.Strict);
    private readonly Mock<ISigneeContextsManager> _signeeContextsManagerMock = new(MockBehavior.Strict);
    private readonly Mock<IAppMetadata> _appMetadataMock = new(MockBehavior.Strict);
    private readonly Mock<IHostEnvironment> _hostEnvironmentMock = new(MockBehavior.Strict);
    private readonly Mock<IPdfService> _pdfServiceMock = new(MockBehavior.Strict);
    private readonly SigningServiceTask _signingProcessTask;

    public SigningServiceTaskTests()
    {
        _signingProcessTask = new SigningServiceTask(
            _signingServiceMock.Object,
            _processReaderMock.Object,
            _appMetadataMock.Object,
            _hostEnvironmentMock.Object,
            _pdfServiceMock.Object,
            _signeeContextsManagerMock.Object,
            Mock.Of<ISignDocumentManager>(MockBehavior.Strict),
            Mock.Of<ISigningReceiptService>(MockBehavior.Strict),
            NullLogger<SigningServiceTask>.Instance
        );

        _appMetadataMock
            .Setup(a => a.GetApplicationMetadata())
            .ReturnsAsync(
                new ApplicationMetadata("ttd/app")
                {
                    DataTypes =
                    [
                        new DataType()
                        {
                            Id = "SignatureDataType",
                            TaskId = "Task_1",
                            AllowedContributors = ["app:owned"],
                        },
                        new DataType()
                        {
                            Id = "SigneeStatesDataTypeId",
                            TaskId = "Task_1",
                            AllowedContributors = ["app:owned"],
                        },
                        new DataType()
                        {
                            Id = "SigningStateDataType",
                            TaskId = "Task_1",
                            AllowedContributors = ["app:owned"],
                            ActionRequiredToRead = "read",
                        },
                    ],
                }
            );
        _hostEnvironmentMock.SetupGet(e => e.EnvironmentName).Returns("Development");
    }

    [Fact]
    public async Task Start_ShouldDeleteExistingSigningData()
    {
        Instance instance = CreateInstance();
        var dataMutator = CreateDataMutator(instance);
        var altinnTaskExtension = new AltinnTaskExtension { SignatureConfiguration = CreateSigningConfiguration() };

        _processReaderMock.Setup(x => x.GetAltinnTaskExtension(It.IsAny<string>())).Returns(altinnTaskExtension);
        _signeeContextsManagerMock
            .Setup(x =>
                x.GenerateSigneeContexts(
                    It.IsAny<IInstanceDataMutator>(),
                    It.IsAny<AltinnSignatureConfiguration>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([])
            .Verifiable(Times.Once);
        _signingServiceMock
            .Setup(x =>
                x.InitializeSignees(
                    It.IsAny<IInstanceDataMutator>(),
                    It.IsAny<List<SigneeContext>>(),
                    It.IsAny<AltinnSignatureConfiguration>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([])
            .Verifiable(Times.Once);

        await _signingProcessTask.Start(CreateProcessTaskContext(dataMutator.Object));

        _signeeContextsManagerMock.VerifyAll();
        _signingServiceMock.VerifyAll();
    }

    [Fact]
    public async Task Start_MissingSigningStateDataType_ThrowsApplicationConfigException()
    {
        Instance instance = CreateInstance();
        var dataMutator = CreateDataMutator(instance);
        var altinnTaskExtension = new AltinnTaskExtension
        {
            SignatureConfiguration = new AltinnSignatureConfiguration { SignatureDataType = "SignatureDataType" },
        };

        _processReaderMock.Setup(x => x.GetAltinnTaskExtension(It.IsAny<string>())).Returns(altinnTaskExtension);

        var exception = await Assert.ThrowsAsync<ApplicationConfigException>(() =>
            _signingProcessTask.Start(CreateProcessTaskContext(dataMutator.Object))
        );

        Assert.Contains(nameof(AltinnSignatureConfiguration.SigningStateDataType), exception.Message);
    }

    [Fact]
    public async Task Start_SigningStateDataTypeUnknown_ThrowsApplicationConfigException()
    {
        Instance instance = CreateInstance();
        var dataMutator = CreateDataMutator(instance);
        var altinnTaskExtension = new AltinnTaskExtension
        {
            SignatureConfiguration = new AltinnSignatureConfiguration
            {
                SignatureDataType = "SignatureDataType",
                SigningStateDataType = "NotInMetadata",
            },
        };

        _processReaderMock.Setup(x => x.GetAltinnTaskExtension(It.IsAny<string>())).Returns(altinnTaskExtension);

        var exception = await Assert.ThrowsAsync<ApplicationConfigException>(() =>
            _signingProcessTask.Start(CreateProcessTaskContext(dataMutator.Object))
        );

        Assert.Contains("NotInMetadata", exception.Message);
    }

    [Fact]
    public async Task End_RevokesDelegatedSigneeRights_WhenRuntimeDelegatedSigningConfigured()
    {
        // Arrange
        Instance instance = CreateInstance();
        var dataMutator = CreateDataMutator(instance);
        var altinnTaskExtension = new AltinnTaskExtension { SignatureConfiguration = CreateSigningConfiguration() };

        _processReaderMock.Setup(x => x.GetAltinnTaskExtension(It.IsAny<string>())).Returns(altinnTaskExtension);
        _signingServiceMock
            .Setup(x =>
                x.RevokeSigneeRightsOnTaskEnd(
                    It.IsAny<IInstanceDataMutator>(),
                    altinnTaskExtension.SignatureConfiguration,
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns(Task.CompletedTask)
            .Verifiable(Times.Once);

        // Act
        await _signingProcessTask.End(CreateProcessTaskContext(dataMutator.Object));

        // Assert
        _signingServiceMock.VerifyAll();
    }

    [Fact]
    public async Task End_DoesNotRevokeSigneeRights_WhenRuntimeDelegatedSigningNotConfigured()
    {
        // Arrange
        Instance instance = CreateInstance();
        var dataMutator = CreateDataMutator(instance);
        var altinnTaskExtension = new AltinnTaskExtension
        {
            SignatureConfiguration = new AltinnSignatureConfiguration { SignatureDataType = "SignatureDataType" },
        };

        _processReaderMock.Setup(x => x.GetAltinnTaskExtension(It.IsAny<string>())).Returns(altinnTaskExtension);

        // Act
        // The strict ISigningService mock has no setup for RevokeSigneeRightsOnTaskEnd, so this throws if it's called.
        await _signingProcessTask.End(CreateProcessTaskContext(dataMutator.Object));

        // Assert
        _signingServiceMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Abandon_ShouldDeleteExistingSigningData()
    {
        Instance instance = CreateInstance();
        var dataMutator = CreateDataMutator(instance);
        var altinnTaskExtension = new AltinnTaskExtension { SignatureConfiguration = CreateSigningConfiguration() };

        _processReaderMock.Setup(x => x.GetAltinnTaskExtension(It.IsAny<string>())).Returns(altinnTaskExtension);
        _signingServiceMock
            .Setup(x =>
                x.AbortRuntimeDelegatedSigning(
                    It.IsAny<IInstanceDataMutator>(),
                    altinnTaskExtension.SignatureConfiguration,
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns(Task.CompletedTask)
            .Verifiable(Times.Once);

        await _signingProcessTask.Abandon(CreateProcessTaskContext(dataMutator.Object));

        _signingServiceMock.VerifyAll();
    }

    [Fact]
    public async Task End_WithSigningPdfDataType_ShouldStorePdfOnMutator()
    {
        Instance instance = CreateInstance();
        var dataMutator = CreateDataMutator(instance);
        var altinnTaskExtension = new AltinnTaskExtension
        {
            SignatureConfiguration = new AltinnSignatureConfiguration { SigningPdfDataType = "signing-pdf" },
        };

        _processReaderMock.Setup(x => x.GetAltinnTaskExtension(It.IsAny<string>())).Returns(altinnTaskExtension);
        _pdfServiceMock
            .Setup(x => x.GeneratePdf(dataMutator.Object, "Task_1", false, null, CancellationToken.None))
            .ReturnsAsync(new MemoryStream([1, 2, 3]));
        dataMutator
            .Setup(x =>
                x.AddBinaryDataElement(
                    "signing-pdf",
                    "application/pdf",
                    "signing-pdf.pdf",
                    It.IsAny<ReadOnlyMemory<byte>>(),
                    "Task_1",
                    null
                )
            )
            .Returns(
                new BinaryDataChange(
                    ChangeType.Created,
                    new DataType { Id = "signing-pdf" },
                    "application/pdf",
                    null,
                    "signing-pdf.pdf",
                    ReadOnlyMemory<byte>.Empty,
                    "Task_1"
                )
            );

        await _signingProcessTask.End(CreateProcessTaskContext(dataMutator.Object));

        _pdfServiceMock.VerifyAll();
        dataMutator.VerifyAll();
    }

    [Fact]
    public async Task End_WithExistingTaskGeneratedPdf_ShouldUpdatePdfOnMutator()
    {
        DataElement existingSigningPdf = new()
        {
            Id = Guid.NewGuid().ToString(),
            DataType = "signing-pdf",
            ContentType = "application/pdf",
            Filename = "signing-pdf.pdf",
            References =
            [
                new Reference
                {
                    Relation = RelationType.GeneratedFrom,
                    ValueType = ReferenceType.Task,
                    Value = "Task_1",
                },
            ],
        };
        Instance instance = CreateInstance(existingSigningPdf);
        var dataMutator = CreateDataMutator(instance);
        var altinnTaskExtension = new AltinnTaskExtension
        {
            SignatureConfiguration = new AltinnSignatureConfiguration { SigningPdfDataType = "signing-pdf" },
        };

        _processReaderMock.Setup(x => x.GetAltinnTaskExtension(It.IsAny<string>())).Returns(altinnTaskExtension);
        _pdfServiceMock
            .Setup(x => x.GeneratePdf(dataMutator.Object, "Task_1", false, null, CancellationToken.None))
            .ReturnsAsync(new MemoryStream([1, 2, 3]));
        dataMutator
            .Setup(x =>
                x.UpdateBinaryDataElement(existingSigningPdf, "application/pdf", It.IsAny<ReadOnlyMemory<byte>>())
            )
            .Returns(
                new BinaryDataChange(
                    ChangeType.Updated,
                    new DataType { Id = "signing-pdf" },
                    "application/pdf",
                    existingSigningPdf,
                    "signing-pdf.pdf",
                    ReadOnlyMemory<byte>.Empty
                )
            );

        await _signingProcessTask.End(CreateProcessTaskContext(dataMutator.Object));

        _pdfServiceMock.VerifyAll();
        dataMutator.VerifyAll();
        dataMutator.Verify(
            x =>
                x.AddBinaryDataElement(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string?>(),
                    It.IsAny<ReadOnlyMemory<byte>>(),
                    It.IsAny<string?>(),
                    It.IsAny<List<KeyValueEntry>?>()
                ),
            Times.Never
        );
    }

    [Fact]
    public void Define_OpensTheSigningRoundAndConcludesOnItsReplies()
    {
        ServiceTaskPipeline pipeline = _signingProcessTask.ResolvePipeline();

        Assert.Equal(2, pipeline.Items.Count);
        var opening = Assert.IsType<ServiceTaskStage.MailboxOpening>(pipeline.Items[0]);
        Assert.Equal(TimeSpan.FromDays(14), opening.Declaration.Timeout);
        var exchange = Assert.IsType<PipelineConclusion.ReplyExchange>(pipeline.Items[1]);
        Assert.Equal(0, exchange.OpeningIndex);
    }

    [Fact]
    public void ProcessTaskResolver_PrefersTheServiceTaskForTheSigningType()
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        services.AddSingleton<IPipelineServiceTask>(_signingProcessTask);
        services.AddSingleton<IProcessTask>(new LegacySigningTask());
        using ServiceProvider serviceProvider = services.BuildServiceProvider();
        var resolver = new ProcessTaskResolver(serviceProvider.GetRequiredService<AppImplementationFactory>());

        Assert.Same(_signingProcessTask, resolver.GetProcessTaskInstance("signing"));
    }

    [Fact]
    public async Task OpenSigningRound_AddsTheSigningStateElementWithTheMailbox()
    {
        Instance instance = CreateInstance();
        var dataMutator = CreateDataMutator(instance);
        ReadOnlyMemory<byte> written = SetupSigningStateWrite(dataMutator);
        _processReaderMock
            .Setup(x => x.GetAltinnTaskExtension("Task_1"))
            .Returns(new AltinnTaskExtension { SignatureConfiguration = CreateSigningConfiguration() });

        ServiceTaskOpeningStageResult result = await OpenSigningRound(dataMutator.Object);

        Assert.IsType<CompletedServiceTaskOpeningStageResult>(result);
        dataMutator.VerifyAll();
        dataMutator.Verify(x => x.RemoveDataElement(It.IsAny<DataElementIdentifier>()), Times.Never);
        SigningRoundState? state = JsonSerializer.Deserialize<SigningRoundState>(_writtenSigningState.Span);
        Assert.Equal(new SigningRoundState("Task_1", _mailboxId, _deadline), state);
    }

    [Fact]
    public async Task OpenSigningRound_ReplacesAnExistingSigningStateElement()
    {
        DataElement existing = new()
        {
            Id = Guid.NewGuid().ToString(),
            DataType = "SigningStateDataType",
            ContentType = "application/json",
        };
        Instance instance = CreateInstance(existing);
        var dataMutator = CreateDataMutator(instance);
        SetupSigningStateWrite(dataMutator);
        dataMutator.Setup(x => x.RemoveDataElement(It.Is<DataElementIdentifier>(id => id.Id == existing.Id)));
        _processReaderMock
            .Setup(x => x.GetAltinnTaskExtension("Task_1"))
            .Returns(new AltinnTaskExtension { SignatureConfiguration = CreateSigningConfiguration() });

        ServiceTaskOpeningStageResult result = await OpenSigningRound(dataMutator.Object);

        Assert.IsType<CompletedServiceTaskOpeningStageResult>(result);
        dataMutator.VerifyAll();
    }

    [Fact]
    public async Task OpenSigningRound_WithoutSigningStateDataType_FailsPermanentlyNamingTheElement()
    {
        Instance instance = CreateInstance();
        var dataMutator = CreateDataMutator(instance);
        _processReaderMock
            .Setup(x => x.GetAltinnTaskExtension("Task_1"))
            .Returns(
                new AltinnTaskExtension
                {
                    SignatureConfiguration = new AltinnSignatureConfiguration
                    {
                        SignatureDataType = "SignatureDataType",
                    },
                }
            );

        ServiceTaskOpeningStageResult result = await OpenSigningRound(dataMutator.Object);

        var failed = Assert.IsType<FailedServiceTaskOpeningStageResult>(result);
        Assert.Equal(FailureKind.Permanent, failed.Kind);
        Assert.Contains(nameof(AltinnSignatureConfiguration.SigningStateDataType), failed.ErrorMessage);
        dataMutator.Verify(
            x =>
                x.AddBinaryDataElement(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string?>(),
                    It.IsAny<ReadOnlyMemory<byte>>(),
                    It.IsAny<string?>(),
                    It.IsAny<List<KeyValueEntry>?>()
                ),
            Times.Never
        );
    }

    private ReadOnlyMemory<byte> _writtenSigningState;

    private ReadOnlyMemory<byte> SetupSigningStateWrite(Mock<IInstanceDataMutator> dataMutator)
    {
        dataMutator.Setup(x =>
            x.OverrideAuthenticationMethod(
                It.Is<DataType>(d => d.Id == "SigningStateDataType"),
                It.IsAny<StorageAuthenticationMethod>()
            )
        );
        dataMutator
            .Setup(x =>
                x.AddBinaryDataElement(
                    "SigningStateDataType",
                    "application/json",
                    null,
                    It.IsAny<ReadOnlyMemory<byte>>(),
                    "Task_1",
                    null
                )
            )
            .Callback(
                (string _, string _, string? _, ReadOnlyMemory<byte> bytes, string? _, List<KeyValueEntry>? _) =>
                    _writtenSigningState = bytes
            )
            .Returns(
                new BinaryDataChange(
                    ChangeType.Created,
                    new DataType { Id = "SigningStateDataType" },
                    "application/json",
                    null,
                    null,
                    ReadOnlyMemory<byte>.Empty,
                    "Task_1"
                )
            );
        return _writtenSigningState;
    }

    private Task<ServiceTaskOpeningStageResult> OpenSigningRound(IInstanceDataMutator dataMutator)
    {
        var opening = Assert.IsType<ServiceTaskStage.MailboxOpening>(_signingProcessTask.ResolvePipeline().Items[0]);
        var context = new ServiceTaskContext
        {
            InstanceDataMutator = dataMutator,
            WorkflowId = Guid.NewGuid(),
            StepId = Guid.NewGuid(),
        };
        return opening.Work(context, new ServiceTaskMailbox { Id = _mailboxId, Deadline = _deadline });
    }

    private sealed class LegacySigningTask : IProcessTask
    {
        public string Type => "signing";
    }

    private static Mock<IInstanceDataMutator> CreateDataMutator(Instance instance)
    {
        var dataMutator = new Mock<IInstanceDataMutator>(MockBehavior.Strict);
        dataMutator.Setup(x => x.Instance).Returns(instance);
        dataMutator.Setup(x => x.TaskId).Returns(instance.Process?.CurrentTask?.ElementId);
        return dataMutator;
    }

    private static ProcessTaskContext CreateProcessTaskContext(IInstanceDataMutator dataMutator) =>
        new() { InstanceDataMutator = dataMutator };

    private static Instance CreateInstance(params DataElement[] dataElements)
    {
        return new Instance()
        {
            Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d",
            AppId = "ttd/test",
            Process = new ProcessState
            {
                CurrentTask = new ProcessElementInfo { AltinnTaskType = "signing", ElementId = "Task_1" },
            },
            Data = [.. dataElements],
        };
    }

    private static AltinnSignatureConfiguration CreateSigningConfiguration()
    {
        return new AltinnSignatureConfiguration
        {
            SignatureDataType = "SignatureDataType",
            SigningStateDataType = "SigningStateDataType",
            SigneeStatesDataTypeId = "SigneeStatesDataTypeId",
            SigneeProviderId = "SigneeProviderId",
        };
    }
}
