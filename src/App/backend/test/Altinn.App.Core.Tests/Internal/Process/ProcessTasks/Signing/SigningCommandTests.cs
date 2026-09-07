using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Features.Signing.Services;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Process.ProcessTasks.Signing;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process.ProcessTasks.Signing;

public class SigningCommandTests
{
    private const string TaskId = "Task_1";

    private readonly Mock<IProcessReader> _processReaderMock = new(MockBehavior.Strict);
    private readonly Mock<ISigningService> _signingServiceMock = new(MockBehavior.Strict);
    private readonly Mock<IPdfService> _pdfServiceMock = new(MockBehavior.Strict);

    [Fact]
    public async Task ResolveSignees_NotRuntimeDelegated_DoesNothingWithoutResolvingService()
    {
        SetupConfiguration(new AltinnSignatureConfiguration { SignatureDataType = "SignatureDataType" });
        // No ISigneeInitializationService registered: resolving it would throw, proving the command never tries.
        using ServiceProvider serviceProvider = CreateServiceProvider(initializationService: null);
        var command = new ResolveSigneesCommand(serviceProvider, _processReaderMock.Object);

        ProcessTaskCommandResult result = await command.Execute(
            CreateContext(CreateDataMutator(CreateInstance()).Object)
        );

        Assert.IsType<CompletedProcessTaskCommandResult>(result);
    }

    [Fact]
    public async Task ResolveSignees_RuntimeDelegated_Success_ReturnsCompleted()
    {
        AltinnSignatureConfiguration configuration = SetupConfiguration(CreateRuntimeDelegatedConfiguration());
        Mock<IInstanceDataMutator> dataMutator = CreateDataMutator(CreateInstance());
        ProcessTaskCommandContext context = CreateContext(dataMutator.Object);
        var initializationServiceMock = new Mock<ISigneeInitializationService>(MockBehavior.Strict);
        initializationServiceMock
            .Setup(x => x.ResolveSignees(dataMutator.Object, configuration, TaskId, context.CancellationToken))
            .ReturnsAsync(SigneeInitializationOutcome.Completed.Instance)
            .Verifiable(Times.Once);
        using ServiceProvider serviceProvider = CreateServiceProvider(initializationServiceMock.Object);
        var command = new ResolveSigneesCommand(serviceProvider, _processReaderMock.Object);

        ProcessTaskCommandResult result = await command.Execute(context);

        Assert.IsType<CompletedProcessTaskCommandResult>(result);
        initializationServiceMock.VerifyAll();
    }

    [Fact]
    public async Task ResolveSignees_ContractViolation_ReturnsFailedPermanentWithMessage()
    {
        AltinnSignatureConfiguration configuration = SetupConfiguration(CreateRuntimeDelegatedConfiguration());
        Mock<IInstanceDataMutator> dataMutator = CreateDataMutator(CreateInstance());
        ProcessTaskCommandContext context = CreateContext(dataMutator.Object);
        var initializationServiceMock = new Mock<ISigneeInitializationService>(MockBehavior.Strict);
        initializationServiceMock
            .Setup(x => x.ResolveSignees(dataMutator.Object, configuration, TaskId, context.CancellationToken))
            .ReturnsAsync(new SigneeInitializationOutcome.ContractViolation("no signee provider registered"));
        using ServiceProvider serviceProvider = CreateServiceProvider(initializationServiceMock.Object);
        var command = new ResolveSigneesCommand(serviceProvider, _processReaderMock.Object);

        ProcessTaskCommandResult result = await command.Execute(context);

        FailedProcessTaskCommandResult failed = Assert.IsType<FailedProcessTaskCommandResult>(result);
        Assert.True(failed.Permanent);
        Assert.Equal("no signee provider registered", failed.ErrorMessage);
    }

    [Fact]
    public async Task ResolveSignees_PermanentException_ReturnsFailedPermanent()
    {
        AltinnSignatureConfiguration configuration = SetupConfiguration(CreateRuntimeDelegatedConfiguration());
        Mock<IInstanceDataMutator> dataMutator = CreateDataMutator(CreateInstance());
        ProcessTaskCommandContext context = CreateContext(dataMutator.Object);
        var initializationServiceMock = new Mock<ISigneeInitializationService>(MockBehavior.Strict);
        initializationServiceMock
            .Setup(x => x.ResolveSignees(dataMutator.Object, configuration, TaskId, context.CancellationToken))
            .ThrowsAsync(new SigneeInitializationPermanentException("could not resolve instance owner"));
        using ServiceProvider serviceProvider = CreateServiceProvider(initializationServiceMock.Object);
        var command = new ResolveSigneesCommand(serviceProvider, _processReaderMock.Object);

        ProcessTaskCommandResult result = await command.Execute(context);

        FailedProcessTaskCommandResult failed = Assert.IsType<FailedProcessTaskCommandResult>(result);
        Assert.True(failed.Permanent);
        Assert.Equal("could not resolve instance owner", failed.ErrorMessage);
    }

    [Fact]
    public async Task ResolveSignees_GenericException_ReturnsFailedRetryable()
    {
        AltinnSignatureConfiguration configuration = SetupConfiguration(CreateRuntimeDelegatedConfiguration());
        Mock<IInstanceDataMutator> dataMutator = CreateDataMutator(CreateInstance());
        ProcessTaskCommandContext context = CreateContext(dataMutator.Object);
        var initializationServiceMock = new Mock<ISigneeInitializationService>(MockBehavior.Strict);
        initializationServiceMock
            .Setup(x => x.ResolveSignees(dataMutator.Object, configuration, TaskId, context.CancellationToken))
            .ThrowsAsync(new InvalidOperationException("register lookup timed out"));
        using ServiceProvider serviceProvider = CreateServiceProvider(initializationServiceMock.Object);
        var command = new ResolveSigneesCommand(serviceProvider, _processReaderMock.Object);

        ProcessTaskCommandResult result = await command.Execute(context);

        FailedProcessTaskCommandResult failed = Assert.IsType<FailedProcessTaskCommandResult>(result);
        Assert.False(failed.Permanent);
    }

    [Fact]
    public void ResolveSigneesCommand_StepOptions_MatchProviderAndRegisterCalls()
    {
        using ServiceProvider serviceProvider = CreateServiceProvider(initializationService: null);
        var command = new ResolveSigneesCommand(serviceProvider, _processReaderMock.Object);

        Assert.Equal(SigningStepOptions.ProviderAndRegisterCalls, command.StepOptions);
        Assert.Equal(TimeSpan.FromMinutes(2), command.StepOptions.MaxExecutionTime);
    }

    [Fact]
    public async Task DelegateSigneeRights_NotRuntimeDelegated_DoesNothingWithoutResolvingService()
    {
        SetupConfiguration(new AltinnSignatureConfiguration { SignatureDataType = "SignatureDataType" });
        using ServiceProvider serviceProvider = CreateServiceProvider(initializationService: null);
        var command = new DelegateSigneeRightsCommand(serviceProvider, _processReaderMock.Object);

        ProcessTaskCommandResult result = await command.Execute(
            CreateContext(CreateDataMutator(CreateInstance()).Object)
        );

        Assert.IsType<CompletedProcessTaskCommandResult>(result);
    }

    [Fact]
    public async Task DelegateSigneeRights_RuntimeDelegated_Success_PassesWorkflowId()
    {
        AltinnSignatureConfiguration configuration = SetupConfiguration(CreateRuntimeDelegatedConfiguration());
        Mock<IInstanceDataMutator> dataMutator = CreateDataMutator(CreateInstance());
        ProcessTaskCommandContext context = CreateContext(dataMutator.Object);
        var initializationServiceMock = new Mock<ISigneeInitializationService>(MockBehavior.Strict);
        initializationServiceMock
            .Setup(x =>
                x.ExecuteDelegation(
                    dataMutator.Object,
                    configuration,
                    TaskId,
                    context.WorkflowId,
                    context.CancellationToken
                )
            )
            .Returns(Task.CompletedTask)
            .Verifiable(Times.Once);
        using ServiceProvider serviceProvider = CreateServiceProvider(initializationServiceMock.Object);
        var command = new DelegateSigneeRightsCommand(serviceProvider, _processReaderMock.Object);

        ProcessTaskCommandResult result = await command.Execute(context);

        Assert.IsType<CompletedProcessTaskCommandResult>(result);
        initializationServiceMock.VerifyAll();
    }

    [Fact]
    public async Task DelegateSigneeRights_PermanentException_ReturnsFailedPermanent()
    {
        AltinnSignatureConfiguration configuration = SetupConfiguration(CreateRuntimeDelegatedConfiguration());
        Mock<IInstanceDataMutator> dataMutator = CreateDataMutator(CreateInstance());
        ProcessTaskCommandContext context = CreateContext(dataMutator.Object);
        var initializationServiceMock = new Mock<ISigneeInitializationService>(MockBehavior.Strict);
        initializationServiceMock
            .Setup(x =>
                x.ExecuteDelegation(
                    dataMutator.Object,
                    configuration,
                    TaskId,
                    context.WorkflowId,
                    context.CancellationToken
                )
            )
            .ThrowsAsync(new SigneeInitializationPermanentException("could not resolve instance owner"));
        using ServiceProvider serviceProvider = CreateServiceProvider(initializationServiceMock.Object);
        var command = new DelegateSigneeRightsCommand(serviceProvider, _processReaderMock.Object);

        ProcessTaskCommandResult result = await command.Execute(context);

        FailedProcessTaskCommandResult failed = Assert.IsType<FailedProcessTaskCommandResult>(result);
        Assert.True(failed.Permanent);
    }

    [Fact]
    public async Task DelegateSigneeRights_GenericException_ReturnsFailedRetryable()
    {
        AltinnSignatureConfiguration configuration = SetupConfiguration(CreateRuntimeDelegatedConfiguration());
        Mock<IInstanceDataMutator> dataMutator = CreateDataMutator(CreateInstance());
        ProcessTaskCommandContext context = CreateContext(dataMutator.Object);
        var initializationServiceMock = new Mock<ISigneeInitializationService>(MockBehavior.Strict);
        initializationServiceMock
            .Setup(x =>
                x.ExecuteDelegation(
                    dataMutator.Object,
                    configuration,
                    TaskId,
                    context.WorkflowId,
                    context.CancellationToken
                )
            )
            .ThrowsAsync(new InvalidOperationException("access management call failed"));
        using ServiceProvider serviceProvider = CreateServiceProvider(initializationServiceMock.Object);
        var command = new DelegateSigneeRightsCommand(serviceProvider, _processReaderMock.Object);

        ProcessTaskCommandResult result = await command.Execute(context);

        FailedProcessTaskCommandResult failed = Assert.IsType<FailedProcessTaskCommandResult>(result);
        Assert.False(failed.Permanent);
    }

    [Fact]
    public void DelegateSigneeRightsCommand_StepOptions_MatchPlatformCallsPerSignee()
    {
        using ServiceProvider serviceProvider = CreateServiceProvider(initializationService: null);
        var command = new DelegateSigneeRightsCommand(serviceProvider, _processReaderMock.Object);

        Assert.Equal(SigningStepOptions.PlatformCallsPerSignee, command.StepOptions);
        Assert.Equal(TimeSpan.FromMinutes(5), command.StepOptions.MaxExecutionTime);
    }

    [Fact]
    public async Task NotifySignees_NotRuntimeDelegated_DoesNothingWithoutResolvingService()
    {
        SetupConfiguration(new AltinnSignatureConfiguration { SignatureDataType = "SignatureDataType" });
        using ServiceProvider serviceProvider = CreateServiceProvider(initializationService: null);
        var command = new NotifySigneesCommand(serviceProvider, _processReaderMock.Object);

        ProcessTaskCommandResult result = await command.Execute(
            CreateContext(CreateDataMutator(CreateInstance()).Object)
        );

        Assert.IsType<CompletedProcessTaskCommandResult>(result);
    }

    [Fact]
    public async Task NotifySignees_RuntimeDelegated_Success_PassesWorkflowIdAndStepId()
    {
        AltinnSignatureConfiguration configuration = SetupConfiguration(CreateRuntimeDelegatedConfiguration());
        Mock<IInstanceDataMutator> dataMutator = CreateDataMutator(CreateInstance());
        ProcessTaskCommandContext context = CreateContext(dataMutator.Object);
        var initializationServiceMock = new Mock<ISigneeInitializationService>(MockBehavior.Strict);
        initializationServiceMock
            .Setup(x =>
                x.ExecuteNotification(
                    dataMutator.Object,
                    configuration,
                    TaskId,
                    context.WorkflowId,
                    context.StepId,
                    context.CancellationToken
                )
            )
            .Returns(Task.CompletedTask)
            .Verifiable(Times.Once);
        using ServiceProvider serviceProvider = CreateServiceProvider(initializationServiceMock.Object);
        var command = new NotifySigneesCommand(serviceProvider, _processReaderMock.Object);

        ProcessTaskCommandResult result = await command.Execute(context);

        Assert.IsType<CompletedProcessTaskCommandResult>(result);
        initializationServiceMock.VerifyAll();
    }

    [Fact]
    public async Task NotifySignees_PermanentException_ReturnsFailedPermanent()
    {
        AltinnSignatureConfiguration configuration = SetupConfiguration(CreateRuntimeDelegatedConfiguration());
        Mock<IInstanceDataMutator> dataMutator = CreateDataMutator(CreateInstance());
        ProcessTaskCommandContext context = CreateContext(dataMutator.Object);
        var initializationServiceMock = new Mock<ISigneeInitializationService>(MockBehavior.Strict);
        initializationServiceMock
            .Setup(x =>
                x.ExecuteNotification(
                    dataMutator.Object,
                    configuration,
                    TaskId,
                    context.WorkflowId,
                    context.StepId,
                    context.CancellationToken
                )
            )
            .ThrowsAsync(new SigneeInitializationPermanentException("no correspondence resource configured"));
        using ServiceProvider serviceProvider = CreateServiceProvider(initializationServiceMock.Object);
        var command = new NotifySigneesCommand(serviceProvider, _processReaderMock.Object);

        ProcessTaskCommandResult result = await command.Execute(context);

        FailedProcessTaskCommandResult failed = Assert.IsType<FailedProcessTaskCommandResult>(result);
        Assert.True(failed.Permanent);
    }

    [Fact]
    public async Task NotifySignees_GenericException_ReturnsFailedRetryable()
    {
        AltinnSignatureConfiguration configuration = SetupConfiguration(CreateRuntimeDelegatedConfiguration());
        Mock<IInstanceDataMutator> dataMutator = CreateDataMutator(CreateInstance());
        ProcessTaskCommandContext context = CreateContext(dataMutator.Object);
        var initializationServiceMock = new Mock<ISigneeInitializationService>(MockBehavior.Strict);
        initializationServiceMock
            .Setup(x =>
                x.ExecuteNotification(
                    dataMutator.Object,
                    configuration,
                    TaskId,
                    context.WorkflowId,
                    context.StepId,
                    context.CancellationToken
                )
            )
            .ThrowsAsync(new InvalidOperationException("correspondence call failed"));
        using ServiceProvider serviceProvider = CreateServiceProvider(initializationServiceMock.Object);
        var command = new NotifySigneesCommand(serviceProvider, _processReaderMock.Object);

        ProcessTaskCommandResult result = await command.Execute(context);

        FailedProcessTaskCommandResult failed = Assert.IsType<FailedProcessTaskCommandResult>(result);
        Assert.False(failed.Permanent);
    }

    [Fact]
    public void NotifySigneesCommand_StepOptions_MatchPlatformCallsPerSignee()
    {
        using ServiceProvider serviceProvider = CreateServiceProvider(initializationService: null);
        var command = new NotifySigneesCommand(serviceProvider, _processReaderMock.Object);

        Assert.Equal(SigningStepOptions.PlatformCallsPerSignee, command.StepOptions);
        Assert.Equal(TimeSpan.FromMinutes(5), command.StepOptions.MaxExecutionTime);
    }

    [Fact]
    public async Task RevokeSigneeRights_RuntimeDelegated_RevokesOnTaskEnd()
    {
        AltinnSignatureConfiguration configuration = SetupConfiguration(CreateRuntimeDelegatedConfiguration());
        Mock<IInstanceDataMutator> dataMutator = CreateDataMutator(CreateInstance());
        _signingServiceMock
            .Setup(x => x.RevokeSigneeRightsOnTaskEnd(dataMutator.Object, configuration, It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask)
            .Verifiable(Times.Once);
        var command = new RevokeSigneeRightsCommand(_processReaderMock.Object, _signingServiceMock.Object);

        ProcessTaskCommandResult result = await command.Execute(CreateContext(dataMutator.Object));

        Assert.IsType<CompletedProcessTaskCommandResult>(result);
        _signingServiceMock.VerifyAll();
    }

    [Fact]
    public async Task RevokeSigneeRights_NotRuntimeDelegated_DoesNothing()
    {
        SetupConfiguration(new AltinnSignatureConfiguration { SignatureDataType = "SignatureDataType" });
        var command = new RevokeSigneeRightsCommand(_processReaderMock.Object, _signingServiceMock.Object);

        ProcessTaskCommandResult result = await command.Execute(
            CreateContext(CreateDataMutator(CreateInstance()).Object)
        );

        Assert.IsType<CompletedProcessTaskCommandResult>(result);
        _signingServiceMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task AbortRuntimeDelegatedSigning_AbortsWithCleanup()
    {
        AltinnSignatureConfiguration configuration = SetupConfiguration(CreateRuntimeDelegatedConfiguration());
        Mock<IInstanceDataMutator> dataMutator = CreateDataMutator(CreateInstance());
        _signingServiceMock
            .Setup(x =>
                x.AbortRuntimeDelegatedSigning(dataMutator.Object, configuration, It.IsAny<CancellationToken>())
            )
            .Returns(Task.CompletedTask)
            .Verifiable(Times.Once);
        var instances = new Mock<IInstanceClient>();
        instances
            .Setup(x =>
                x.GetInstance(
                    dataMutator.Object.Instance,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(CreateInstance());
        var command = new AbortRuntimeDelegatedSigningCommand(
            _processReaderMock.Object,
            _signingServiceMock.Object,
            instances.Object
        );

        ProcessTaskCommandResult result = await command.Execute(CreateContext(dataMutator.Object));

        Assert.IsType<CompletedProcessTaskCommandResult>(result);
        _signingServiceMock.VerifyAll();
    }

    [Fact]
    public async Task GenerateSigningPdf_WithSigningPdfDataType_StoresPdfOnMutator()
    {
        SetupConfiguration(new AltinnSignatureConfiguration { SigningPdfDataType = "signing-pdf" });
        Mock<IInstanceDataMutator> dataMutator = CreateDataMutator(CreateInstance());
        _pdfServiceMock
            .Setup(x => x.GeneratePdf(dataMutator.Object, TaskId, false, null, CancellationToken.None))
            .ReturnsAsync(new MemoryStream([1, 2, 3]));
        dataMutator
            .Setup(x =>
                x.AddBinaryDataElement(
                    "signing-pdf",
                    "application/pdf",
                    "signing-pdf.pdf",
                    It.IsAny<ReadOnlyMemory<byte>>(),
                    TaskId,
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
                    TaskId
                )
            );
        var command = new GenerateSigningPdfCommand(_processReaderMock.Object, _pdfServiceMock.Object);

        ProcessTaskCommandResult result = await command.Execute(CreateContext(dataMutator.Object));

        Assert.IsType<CompletedProcessTaskCommandResult>(result);
        _pdfServiceMock.VerifyAll();
        dataMutator.VerifyAll();
    }

    [Fact]
    public async Task GenerateSigningPdf_WithExistingTaskGeneratedPdf_UpdatesPdfOnMutator()
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
                    Value = TaskId,
                },
            ],
        };
        SetupConfiguration(new AltinnSignatureConfiguration { SigningPdfDataType = "signing-pdf" });
        Mock<IInstanceDataMutator> dataMutator = CreateDataMutator(CreateInstance(existingSigningPdf));
        _pdfServiceMock
            .Setup(x => x.GeneratePdf(dataMutator.Object, TaskId, false, null, CancellationToken.None))
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
        var command = new GenerateSigningPdfCommand(_processReaderMock.Object, _pdfServiceMock.Object);

        ProcessTaskCommandResult result = await command.Execute(CreateContext(dataMutator.Object));

        Assert.IsType<CompletedProcessTaskCommandResult>(result);
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
    public async Task GenerateSigningPdf_WithoutSigningPdfDataType_DoesNothing()
    {
        SetupConfiguration(new AltinnSignatureConfiguration { SignatureDataType = "SignatureDataType" });
        var command = new GenerateSigningPdfCommand(_processReaderMock.Object, _pdfServiceMock.Object);

        ProcessTaskCommandResult result = await command.Execute(
            CreateContext(CreateDataMutator(CreateInstance()).Object)
        );

        Assert.IsType<CompletedProcessTaskCommandResult>(result);
        _pdfServiceMock.VerifyNoOtherCalls();
    }

    private AltinnSignatureConfiguration SetupConfiguration(AltinnSignatureConfiguration configuration)
    {
        _processReaderMock
            .Setup(x => x.GetAltinnTaskExtension(TaskId))
            .Returns(new AltinnTaskExtension { SignatureConfiguration = configuration });
        return configuration;
    }

    private static ProcessTaskCommandContext CreateContext(IInstanceDataMutator dataMutator) =>
        new()
        {
            InstanceDataMutator = dataMutator,
            TaskId = TaskId,
            WorkflowId = Guid.NewGuid(),
            StepId = Guid.NewGuid(),
        };

    /// <summary>
    /// A service provider that resolves <see cref="ISigneeInitializationService"/> to the given mock, or that
    /// has none registered at all so that resolving it throws — used to prove a non-delegated configuration
    /// never touches the provider.
    /// </summary>
    private static ServiceProvider CreateServiceProvider(ISigneeInitializationService? initializationService)
    {
        var services = new ServiceCollection();
        if (initializationService is not null)
        {
            services.AddSingleton(initializationService);
        }
        return services.BuildServiceProvider();
    }

    private static Mock<IInstanceDataMutator> CreateDataMutator(Instance instance)
    {
        // Commands read the task id from their context, never from the mutator, so no TaskId setup here: with a
        // strict mock, VerifyAll would flag an unused one.
        var dataMutator = new Mock<IInstanceDataMutator>(MockBehavior.Strict);
        dataMutator.Setup(x => x.Instance).Returns(instance);
        return dataMutator;
    }

    private static Instance CreateInstance(params DataElement[] dataElements) =>
        new()
        {
            Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d",
            AppId = "ttd/test",
            Process = new ProcessState
            {
                CurrentTask = new ProcessElementInfo { AltinnTaskType = "signing", ElementId = TaskId },
            },
            Data = [.. dataElements],
        };

    private static AltinnSignatureConfiguration CreateRuntimeDelegatedConfiguration() =>
        new()
        {
            SignatureDataType = "SignatureDataType",
            SigneeStatesDataTypeId = "SigneeStatesDataTypeId",
            SigneeProviderId = "SigneeProviderId",
        };
}
