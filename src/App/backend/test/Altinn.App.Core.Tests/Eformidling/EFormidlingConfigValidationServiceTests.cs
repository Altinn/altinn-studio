using Altinn.App.Core.EFormidling;
using Altinn.App.Core.EFormidling.Configuration;
using Altinn.App.Core.EFormidling.Implementation;
using Altinn.App.Core.EFormidling.Interface;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Altinn.App.Core.Tests.Eformidling;

public class EFormidlingConfigValidationServiceTests
{
    private const string ModelDataType = "model";

    private static AltinnEFormidlingConfiguration ValidConfig(string? disabledValue = null) =>
        new()
        {
            Disabled = disabledValue is null ? [] : [new AltinnEnvironmentConfig { Value = disabledValue }],
            Process = [new AltinnEnvironmentConfig { Value = "process" }],
            Standard = [new AltinnEnvironmentConfig { Value = "standard" }],
            TypeVersion = [new AltinnEnvironmentConfig { Value = "1.0" }],
            Type = [new AltinnEnvironmentConfig { Value = "type" }],
            SecurityLevel = [new AltinnEnvironmentConfig { Value = "3" }],
            DataTypes = [new AltinnEFormidlingDataTypesConfig { DataTypeIds = [ModelDataType] }],
        };

    private static ServiceTask EFormidlingTask(string id, AltinnEFormidlingConfiguration? config) =>
        new()
        {
            Id = id,
            ExtensionElements = new ExtensionElements
            {
                TaskExtension = new AltinnTaskExtension { TaskType = "eFormidling", EFormidlingConfiguration = config },
            },
        };

    /// <summary>
    /// Which <see cref="IEFormidlingService"/> the app under validation has. The distinction matters:
    /// only <c>BuiltIn</c> reads an <see cref="IEFormidlingMetadata"/>, so only it requires one.
    /// </summary>
    private enum EFormidlingService
    {
        None,
        BuiltIn,
        Replaced,
    }

    private static Task RunValidation(
        IReadOnlyList<ProcessTask> tasks,
        EFormidlingService eFormidlingService = EFormidlingService.BuiltIn,
        bool registerEFormidlingMetadata = true,
        string environment = "Production",
        List<DataType>? dataTypes = null,
        string? baseUrl = "https://platform.example/eformidling/"
    )
    {
        var processReader = new Mock<IProcessReader>();
        processReader.Setup(x => x.GetProcessTasks()).Returns([.. tasks]);

        var appMetadata = new Mock<IAppMetadata>();
        appMetadata
            .Setup(x => x.GetApplicationMetadata())
            .ReturnsAsync(
                new ApplicationMetadata("ttd/test-app")
                {
                    Org = "ttd",
                    DataTypes = dataTypes ?? [new DataType { Id = ModelDataType }],
                }
            );

        var hostEnvironment = new Mock<IHostEnvironment>();
        hostEnvironment.Setup(x => x.EnvironmentName).Returns(environment);

        var services = new ServiceCollection();
        services.AddLogging();
        services.AddAppImplementationFactory();
        services.AddSingleton(processReader.Object);
        services.AddSingleton(appMetadata.Object);
        services.AddSingleton(hostEnvironment.Object);
        services.AddSingleton(new Mock<IUserTokenProvider>().Object);
        services.Configure<EFormidlingClientSettings>(settings => settings.BaseUrl = baseUrl);
        switch (eFormidlingService)
        {
            case EFormidlingService.BuiltIn:
                services.AddTransient<IEFormidlingService, DefaultEFormidlingService>();
                break;
            case EFormidlingService.Replaced:
                services.AddSingleton(new Mock<IEFormidlingService>().Object);
                break;
        }
        if (registerEFormidlingMetadata)
        {
            services.AddSingleton(new Mock<IEFormidlingMetadata>().Object);
        }

        ServiceProvider provider = services.BuildServiceProvider();
        var validationService = new EFormidlingConfigValidationService(
            provider.GetRequiredService<IServiceScopeFactory>(),
            NullLogger<EFormidlingConfigValidationService>.Instance
        );

        return validationService.StartAsync(CancellationToken.None);
    }

    [Fact]
    public async Task DoesNothing_When_NoEFormidlingTasks()
    {
        var dataTask = new ProcessTask
        {
            Id = "Task_1",
            ExtensionElements = new ExtensionElements { TaskExtension = new AltinnTaskExtension { TaskType = "data" } },
        };

        // Notably does not require IEFormidlingService: an app with no eFormidling task must not be
        // made to register eFormidling services.
        await RunValidation([dataTask], eFormidlingService: EFormidlingService.None);
    }

    [Fact]
    public async Task Passes_When_ConfigurationIsComplete()
    {
        await RunValidation([EFormidlingTask("Task_Send", ValidConfig())]);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Fails_When_BaseUrlIsMissing(string? baseUrl)
    {
        var exception = await Assert.ThrowsAsync<ApplicationConfigException>(() =>
            RunValidation([EFormidlingTask("Task_Send", ValidConfig())], baseUrl: baseUrl)
        );

        Assert.Contains(nameof(EFormidlingClientSettings.BaseUrl), exception.Message);
    }

    [Fact]
    public async Task Passes_When_BaseUrlIsMissing_But_ServiceIsReplaced()
    {
        // An app that composes its own shipment does not ship through the built-in client, so it has
        // no reason to configure one.
        await RunValidation(
            [EFormidlingTask("Task_Send", ValidConfig())],
            eFormidlingService: EFormidlingService.Replaced,
            baseUrl: null
        );
    }

    [Fact]
    public async Task Fails_When_TaskHasNoConfigurationBlock()
    {
        var exception = await Assert.ThrowsAsync<ApplicationConfigException>(() =>
            RunValidation([EFormidlingTask("Task_Send", config: null)])
        );

        Assert.Contains("Task_Send", exception.Message);
        Assert.Contains("no <altinn:eFormidlingConfig>", exception.Message);
    }

    [Fact]
    public async Task Fails_When_RequiredConfigurationIsMissing()
    {
        AltinnEFormidlingConfiguration config = ValidConfig();
        config.Process = [];

        var exception = await Assert.ThrowsAsync<ApplicationConfigException>(() =>
            RunValidation([EFormidlingTask("Task_Send", config)])
        );

        Assert.Contains("Task_Send", exception.Message);
    }

    [Fact]
    public async Task Fails_When_ShippedDataTypeIsNotDeclared()
    {
        var exception = await Assert.ThrowsAsync<ApplicationConfigException>(() =>
            RunValidation([EFormidlingTask("Task_Send", ValidConfig())], dataTypes: [new DataType { Id = "other" }])
        );

        Assert.Contains($"ships data type '{ModelDataType}'", exception.Message);
    }

    [Fact]
    public async Task Fails_When_EnabledButServiceIsNotRegistered()
    {
        var exception = await Assert.ThrowsAsync<ApplicationConfigException>(() =>
            RunValidation([EFormidlingTask("Task_Send", ValidConfig())], eFormidlingService: EFormidlingService.None)
        );

        Assert.Contains("AddEFormidling()", exception.Message);
    }

    [Fact]
    public async Task Fails_When_EnabledButMetadataIsNotRegistered()
    {
        // The shape of an app that called AddEFormidling() but never completed the builder: everything
        // except the one implementation only the app can supply.
        var exception = await Assert.ThrowsAsync<ApplicationConfigException>(() =>
            RunValidation([EFormidlingTask("Task_Send", ValidConfig())], registerEFormidlingMetadata: false)
        );

        Assert.Contains(nameof(IEFormidlingMetadata), exception.Message);
        Assert.Contains("WithMetadata", exception.Message);
    }

    [Fact]
    public async Task Passes_When_TheAppReplacedTheServiceAndHasNoMetadata()
    {
        // Only the built-in service reads an IEFormidlingMetadata, to build the arkivmelding. An app
        // supplying its own IEFormidlingService composes the whole shipment itself, so demanding a
        // metadata generator it will never call would fail a perfectly well-formed deployment.
        await RunValidation(
            [EFormidlingTask("Task_Send", ValidConfig())],
            eFormidlingService: EFormidlingService.Replaced,
            registerEFormidlingMetadata: false
        );
    }

    [Fact]
    public async Task Passes_When_DisabledAndServiceIsNotRegistered()
    {
        // The shape a real app ships: eFormidling configured for production, switched off and
        // unregistered in development. Requiring the service here would stop it booting locally.
        await RunValidation(
            [EFormidlingTask("Task_Send", ValidConfig(disabledValue: "true"))],
            eFormidlingService: EFormidlingService.None
        );
    }

    [Fact]
    public async Task ReportsEveryProblem_NotJustTheFirst()
    {
        AltinnEFormidlingConfiguration missingProcess = ValidConfig();
        missingProcess.Process = [];

        var exception = await Assert.ThrowsAsync<ApplicationConfigException>(() =>
            RunValidation([EFormidlingTask("Task_A", missingProcess), EFormidlingTask("Task_B", config: null)])
        );

        Assert.Contains("Task_A", exception.Message);
        Assert.Contains("Task_B", exception.Message);
    }
}
