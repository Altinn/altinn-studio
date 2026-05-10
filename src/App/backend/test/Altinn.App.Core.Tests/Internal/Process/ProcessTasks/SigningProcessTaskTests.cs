using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Features.Signing.Services;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Hosting;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process.ProcessTasks;

public class SigningProcessTaskTests
{
    private readonly Mock<IProcessReader> _processReaderMock = new(MockBehavior.Strict);
    private readonly Mock<ISigningService> _signingServiceMock = new(MockBehavior.Strict);
    private readonly Mock<ISigneeContextsManager> _signeeContextsManagerMock = new(MockBehavior.Strict);
    private readonly Mock<IAppMetadata> _appMetadataMock = new(MockBehavior.Strict);
    private readonly Mock<IHostEnvironment> _hostEnvironmentMock = new(MockBehavior.Strict);
    private readonly Mock<IPdfService> _pdfServiceMock = new(MockBehavior.Strict);
    private readonly SigningProcessTask _signingProcessTask;

    public SigningProcessTaskTests()
    {
        _signingProcessTask = new SigningProcessTask(
            _signingServiceMock.Object,
            _processReaderMock.Object,
            _appMetadataMock.Object,
            _hostEnvironmentMock.Object,
            _pdfServiceMock.Object,
            _signeeContextsManagerMock.Object
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

        await _signingProcessTask.Start(dataMutator.Object);

        _signeeContextsManagerMock.VerifyAll();
        _signingServiceMock.VerifyAll();
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

        await _signingProcessTask.Abandon(dataMutator.Object);

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
            .Setup(x => x.GeneratePdf(instance, "Task_1", false, null, CancellationToken.None))
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

        await _signingProcessTask.End(dataMutator.Object);

        _pdfServiceMock.VerifyAll();
        dataMutator.VerifyAll();
    }

    private static Mock<IInstanceDataMutator> CreateDataMutator(Instance instance)
    {
        var dataMutator = new Mock<IInstanceDataMutator>(MockBehavior.Strict);
        dataMutator.Setup(x => x.Instance).Returns(instance);
        dataMutator.Setup(x => x.TaskId).Returns(instance.Process?.CurrentTask?.ElementId);
        return dataMutator;
    }

    private static Instance CreateInstance()
    {
        return new Instance()
        {
            Id = "1337/fa0678ad-960d-4307-aba2-ba29c9804c9d",
            AppId = "ttd/test",
            Process = new ProcessState
            {
                CurrentTask = new ProcessElementInfo { AltinnTaskType = "signing", ElementId = "Task_1" },
            },
            Data = [],
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
