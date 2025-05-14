using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Features.Signing.Services;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process.ProcessTasks;

public class SigningProcessTaskTests
{
    private readonly Mock<IProcessReader> _processReaderMock = new();
    private readonly Mock<IInstanceClient> _instanceClientMock = new();
    private readonly Mock<ISigningService> _signingServiceMock = new();
    private readonly Mock<ISigneeContextsManager> _signeeContextsManagerMock = new();
    private readonly Mock<IAppMetadata> _appMetadataMock = new();
    private readonly Mock<IHostEnvironment> _hostEnvironmentMock = new();
    private readonly Mock<IAppModel> _appModelMock = new();
    private readonly Mock<IDataClient> _dataClientMock = new();
    private readonly Mock<IPdfService> _pdfServiceMock = new();
    private readonly Mock<IAppResources> _appResourcesMock = new();
    private readonly ServiceCollection _serviceCollection = new();

    public SigningProcessTaskTests()
    {
        _serviceCollection.AddTransient<ModelSerializationService>();
        _serviceCollection.AddTransient<InstanceDataUnitOfWorkInitializer>();
        _serviceCollection.AddTransient<SigningProcessTask>();
        _serviceCollection.AddSingleton(Options.Create(new FrontEndSettings()));
        _serviceCollection.AddSingleton(_processReaderMock.Object);
        _serviceCollection.AddSingleton(_signingServiceMock.Object);
        _serviceCollection.AddSingleton(_signeeContextsManagerMock.Object);
        _serviceCollection.AddSingleton(_instanceClientMock.Object);
        _serviceCollection.AddSingleton(_appModelMock.Object);
        _serviceCollection.AddSingleton(_appMetadataMock.Object);
        _serviceCollection.AddSingleton(_hostEnvironmentMock.Object);
        _serviceCollection.AddSingleton(_dataClientMock.Object);
        _serviceCollection.AddSingleton(_pdfServiceMock.Object);
        _serviceCollection.AddSingleton(_appResourcesMock.Object);
    }

    [Fact]
    public async Task Start_ShouldDeleteExistingSigningData()
    {
        // Arrange
        Instance instance = CreateInstance();
        string taskId = instance.Process.CurrentTask.ElementId;
        var altinnTaskExtension = new AltinnTaskExtension { SignatureConfiguration = CreateSigningConfiguration() };

        await using var sp = _serviceCollection.BuildStrictServiceProvider();
        var signingProcessTask = sp.GetRequiredService<SigningProcessTask>();

        _processReaderMock.Setup(x => x.GetAltinnTaskExtension(It.IsAny<string>())).Returns(altinnTaskExtension);
        _signeeContextsManagerMock
            .Setup(x =>
                x.GenerateSigneeContexts(
                    It.IsAny<IInstanceDataMutator>(),
                    It.IsAny<AltinnSignatureConfiguration>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([]);

        // Act
        await signingProcessTask.Start(taskId, instance);

        // Assert
        _signeeContextsManagerMock.Verify(
            x =>
                x.GenerateSigneeContexts(
                    It.IsAny<IInstanceDataMutator>(),
                    It.IsAny<AltinnSignatureConfiguration>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );

        _signingServiceMock.Verify(
            x =>
                x.InitializeSignees(
                    It.IsAny<IInstanceDataMutator>(),
                    It.IsAny<List<SigneeContext>>(),
                    It.IsAny<AltinnSignatureConfiguration>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );

        _signingServiceMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Abandon_ShouldDeleteExistingSigningData()
    {
        // Arrange
        Instance instance = CreateInstance();
        string taskId = instance.Process.CurrentTask.ElementId;
        var altinnTaskExtension = new AltinnTaskExtension { SignatureConfiguration = CreateSigningConfiguration() };

        await using var sp = _serviceCollection.BuildStrictServiceProvider();
        var signingProcessTask = sp.GetRequiredService<SigningProcessTask>();

        _processReaderMock.Setup(x => x.GetAltinnTaskExtension(It.IsAny<string>())).Returns(altinnTaskExtension);

        // Act
        await signingProcessTask.Abandon(taskId, instance);

        // Assert
        _signingServiceMock.Verify(x =>
            x.AbortRuntimeDelegatedSigning(
                It.IsAny<IInstanceDataMutator>(),
                altinnTaskExtension.SignatureConfiguration,
                It.IsAny<CancellationToken>()
            )
        );
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
