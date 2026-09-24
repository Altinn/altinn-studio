using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Features.Signing;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Features.Signing.Services;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Testing;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process.ProcessTasks;

public sealed class SigningProcessTaskTests : IDisposable
{
    private readonly Mock<IProcessReader> _processReaderMock = new(MockBehavior.Strict);
    private readonly Mock<ISigningService> _signingServiceMock = new(MockBehavior.Strict);
    private readonly Mock<ISigneeContextsManager> _signeeContextsManagerMock = new(MockBehavior.Strict);
    private readonly Mock<IPdfService> _pdfServiceMock = new(MockBehavior.Strict);
    private readonly SigningProcessTask _signingProcessTask;
    private readonly ServiceProvider _services;
    private readonly FakeLogger<SigningProcessTask> _logger = new();

    public SigningProcessTaskTests()
    {
        var provider = new Mock<ISigneeProvider>(MockBehavior.Strict);
        provider.SetupGet(p => p.Id).Returns("SigneeProviderId");
        _services = new ServiceCollection().AddSingleton(provider.Object).BuildServiceProvider();
        _signingProcessTask = new SigningProcessTask(
            _signingServiceMock.Object,
            _processReaderMock.Object,
            _services,
            _logger,
            _pdfServiceMock.Object,
            _signeeContextsManagerMock.Object
        );
    }

    public void Dispose() => _services.Dispose();

    [Fact]
    public void ValidateConfiguration_MissingSigningConfiguration_ReturnsFinding()
    {
        _processReaderMock
            .Setup(r => r.GetAltinnTaskExtension("Task_1"))
            .Returns(new AltinnTaskExtension { SignatureConfiguration = null });

        string finding = Assert.Single(
            _signingProcessTask.ValidateConfiguration(ValidationContext(HostingEnvironment.Production))
        );

        Assert.Contains("SignatureConfig is missing", finding);
    }

    [Fact]
    public void ValidateConfiguration_ReportsMissingSignatureDataTypeAndIncompleteDelegationTogether()
    {
        _processReaderMock
            .Setup(r => r.GetAltinnTaskExtension("Task_1"))
            .Returns(
                new AltinnTaskExtension
                {
                    SignatureConfiguration = new AltinnSignatureConfiguration
                    {
                        SigneeStatesDataTypeId = "signee-states",
                    },
                }
            );

        string[] findings = _signingProcessTask
            .ValidateConfiguration(ValidationContext(HostingEnvironment.Production))
            .ToArray();

        Assert.Equal(2, findings.Length);
        Assert.Contains(findings, finding => finding.Contains("SignatureDataType"));
        Assert.Contains(findings, finding => finding.Contains("must either be set together"));
    }

    [Theory]
    [InlineData(HostingEnvironment.Development, 2)]
    [InlineData(HostingEnvironment.Production, 0)]
    public void ValidateConfiguration_DataTypesMustBeAppOwnedDuringDevelopment(
        HostingEnvironment environment,
        int expectedFindings
    )
    {
        AltinnSignatureConfiguration configuration = CreateSigningConfiguration();
        configuration.CorrespondenceResources = [new AltinnEnvironmentConfig { Value = "correspondence-resource" }];
        _processReaderMock
            .Setup(r => r.GetAltinnTaskExtension("Task_1"))
            .Returns(new AltinnTaskExtension { SignatureConfiguration = configuration });
        ProcessTaskValidationContext context = ValidationContext(environment);
        context.ApplicationMetadata.DataTypes.ForEach(type => type.AllowedContributors = null);

        string[] findings = _signingProcessTask.ValidateConfiguration(context).ToArray();

        Assert.Equal(expectedFindings, findings.Length);
        Assert.All(findings, finding => Assert.Contains("app:owned", finding));
    }

    [Theory]
    [InlineData(HostingEnvironment.Development, false)]
    [InlineData(HostingEnvironment.Staging, false)]
    [InlineData(HostingEnvironment.Production, true)]
    public void ValidateConfiguration_CorrespondenceResourceIsRequiredForTheDeployedEnvironment(
        HostingEnvironment environment,
        bool fails
    )
    {
        AltinnSignatureConfiguration configuration = CreateSigningConfiguration();
        configuration.CorrespondenceResources =
        [
            new AltinnEnvironmentConfig { Environment = "tt02", Value = "staging-resource" },
        ];
        _processReaderMock
            .Setup(r => r.GetAltinnTaskExtension("Task_1"))
            .Returns(new AltinnTaskExtension { SignatureConfiguration = configuration });

        string[] findings = _signingProcessTask.ValidateConfiguration(ValidationContext(environment)).ToArray();

        if (fails)
            Assert.Contains("No correspondence resource", Assert.Single(findings));
        else
            Assert.Empty(findings);
        Assert.Equal(
            environment == HostingEnvironment.Development,
            _logger.Collector.GetSnapshot().Any(log => log.Level == LogLevel.Warning && log.Message.Contains("Task_1"))
        );
    }

    private static ProcessTaskValidationContext ValidationContext(HostingEnvironment environment) =>
        new()
        {
            TaskId = "Task_1",
            Environment = environment,
            ApplicationMetadata = new ApplicationMetadata("ttd/app")
            {
                DataTypes =
                [
                    new DataType { Id = "SignatureDataType", AllowedContributors = ["app:owned"] },
                    new DataType { Id = "SigneeStatesDataTypeId", AllowedContributors = ["app:owned"] },
                ],
            },
        };

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
            SigneeStatesDataTypeId = "SigneeStatesDataTypeId",
            SigneeProviderId = "SigneeProviderId",
        };
    }
}
