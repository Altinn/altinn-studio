using Altinn.App.Clients.Fiks.Extensions;
using Altinn.App.Clients.Fiks.FiksArkiv;
using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Clients.Fiks.FiksIO;
using Altinn.App.Clients.Fiks.FiksIO.Models;
using Altinn.App.Core.Internal.AltinnCdn;
using Moq;
using Polly;
using Polly.DependencyInjection;
using Polly.Retry;
using Polly.Testing;
using Polly.Timeout;

namespace Altinn.App.Clients.Fiks.Tests.Extensions;

public class ServiceCollectionExtensionsTests
{
    [Fact]
    public async Task AddFiksIOClient_AddsRequiredServicesWithDefaultValues()
    {
        // Arrange
        await using var fixture = TestFixture.Create(services => services.AddFiksIOClient());

        // Act
        var fiksIOClient = fixture.FiksIOClient;
        var fiksIOSettings = fixture.FiksIOSettings;
        var resiliencePipeline = fixture.FiksIOResiliencePipeline;

        // Assert
        Assert.NotNull(fiksIOClient);
        Assert.NotNull(fiksIOSettings);
        Assert.NotNull(resiliencePipeline);
        Assert.IsType<FiksIOClient>(fiksIOClient);
        Assert.Equal(TestHelpers.DefaultFiksIOSettings, fiksIOSettings);

        AssertDefaultResiliencePipeline(resiliencePipeline);
    }

    [Fact]
    public async Task AddFiksIOClient_OverridesResiliencePipeline()
    {
        // Arrange
        var pipelineOverride = (
            ResiliencePipelineBuilder<FiksIOMessageResponse> builder,
            AddResiliencePipelineContext<string> context
        ) =>
        {
            builder.AddRetry(new RetryStrategyOptions<FiksIOMessageResponse> { MaxRetryAttempts = int.MaxValue });
        };

        await using var fixture = TestFixture.Create(services =>
            services.AddFiksIOClient().WithResiliencePipeline(pipelineOverride)
        );

        // Act
        var resiliencePipeline = fixture.FiksIOResiliencePipeline;
        var resiliencePipelineDescriptor = resiliencePipeline.GetPipelineDescriptor();

        // Assert
        Assert.NotNull(resiliencePipeline);
        Assert.Single(resiliencePipelineDescriptor.Strategies);
        var retryOptions = Assert.IsType<RetryStrategyOptions<FiksIOMessageResponse>>(
            resiliencePipelineDescriptor.Strategies[0].Options
        );
        Assert.Equal(int.MaxValue, retryOptions.MaxRetryAttempts);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task AddFiksIOClient_OverridesConfig_Delegates(bool provideDefaultSettings)
    {
        // Arrange
        var fiksIOSettingsOverride = TestHelpers.RandomFiksIOSettings;
        var maskinportenSettingsOverride = TestHelpers.RandomMaskinportenSettings;
        await using var fixture = TestFixture.Create(
            services =>
            {
                services
                    .AddFiksIOClient()
                    .WithFiksIOConfig(x =>
                    {
                        x.AccountId = fiksIOSettingsOverride.AccountId;
                        x.IntegrationId = fiksIOSettingsOverride.IntegrationId;
                        x.IntegrationPassword = fiksIOSettingsOverride.IntegrationPassword;
                        x.AccountPrivateKeyBase64 = fiksIOSettingsOverride.AccountPrivateKeyBase64;
                        x.AmqpHost = fiksIOSettingsOverride.AmqpHost;
                        x.ApiHost = fiksIOSettingsOverride.ApiHost;
                    })
                    .WithMaskinportenConfig(x =>
                    {
                        x.Authority = maskinportenSettingsOverride.Authority;
                        x.ClientId = maskinportenSettingsOverride.ClientId;
                        x.JwkBase64 = maskinportenSettingsOverride.JwkBase64;
                    });
            },
            useDefaultFiksIOSettings: provideDefaultSettings,
            useDefaultMaskinportenSettings: provideDefaultSettings
        );

        // Act
        var fiksIOSettings = fixture.FiksIOSettings;
        var maskinportenSettings = fixture.MaskinportenSettings;

        // Assert
        Assert.NotNull(fiksIOSettings);
        Assert.NotNull(maskinportenSettings);
        Assert.Equal(fiksIOSettingsOverride, fiksIOSettings);
        Assert.Equal(maskinportenSettingsOverride, maskinportenSettings);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task AddFiksIOClient_OverridesConfig_JsonPaths(bool provideDefaultSettings)
    {
        // Arrange
        var fiksIOSettingsOverride = TestHelpers.RandomFiksIOSettings;
        var maskinportenSettingsOverride = TestHelpers.RandomMaskinportenSettings;
        await using var fixture = TestFixture.Create(
            services =>
            {
                services
                    .AddFiksIOClient()
                    .WithFiksIOConfig("SuperCustomFiksIOSettings")
                    .WithMaskinportenConfig("SuperCustomMaskinportenSettings");
            },
            [
                ("SuperCustomFiksIOSettings", fiksIOSettingsOverride),
                ("SuperCustomMaskinportenSettings", maskinportenSettingsOverride),
            ],
            useDefaultFiksIOSettings: provideDefaultSettings,
            useDefaultMaskinportenSettings: provideDefaultSettings
        );

        // Act
        var fiksIOSettings = fixture.FiksIOSettings;
        var maskinportenSettings = fixture.MaskinportenSettings;

        // Assert
        Assert.NotNull(fiksIOSettings);
        Assert.NotNull(maskinportenSettings);
        Assert.Equal(fiksIOSettingsOverride, fiksIOSettings);
        Assert.Equal(maskinportenSettingsOverride, maskinportenSettings);
    }

    [Fact]
    public async Task AddFiksArkiv_AddsRequiredServicesWithDefaultValues()
    {
        // Arrange
        await using var fixture = TestFixture.Create(
            services => services.AddFiksArkiv(),
            mockFiksIOClientFactory: false
        );

        fixture
            .HttpClientFactoryMock.Setup(x => x.CreateClient(It.IsAny<string>()))
            .Returns(new HttpClient(new Mock<HttpMessageHandler>().Object));

        // Act
        var fiksIOClient = fixture.FiksIOClient;
        var fiksIOSettings = fixture.FiksIOSettings;
        var fiksIOClientFactory = fixture.FiksIOClientFactory;
        var resiliencePipeline = fixture.FiksIOResiliencePipeline;
        var altinnCdnClient = fixture.AltinnCdnClient;
        var fiksArkivHost = fixture.FiksArkivHost;
        var fiksArkivServiceTask = fixture.FiksArkivServiceTask;
        var fiksArkivConfigValidationService = fixture.FiksArkivConfigValidationService;
        var fiksArkivConfigResolver = fixture.FiksArkivConfigResolver;
        var fiksArkivInstanceClient = fixture.FiksArkivInstanceClient;
        var fiksArkivPayloadGenerator = fixture.FiksArkivPayloadGenerator;
        var fiksArkivResponseHandler = fixture.FiksArkivResponseHandler;

        // Assert
        Assert.NotNull(fiksIOClient);
        Assert.NotNull(fiksIOSettings);
        Assert.NotNull(fiksIOClientFactory);
        Assert.NotNull(resiliencePipeline);
        Assert.NotNull(altinnCdnClient);
        Assert.NotNull(fiksArkivHost);
        Assert.NotNull(fiksArkivServiceTask);
        Assert.NotNull(fiksArkivConfigValidationService);
        Assert.NotNull(fiksArkivConfigResolver);
        Assert.NotNull(fiksArkivInstanceClient);
        Assert.NotNull(fiksArkivPayloadGenerator);
        Assert.NotNull(fiksArkivResponseHandler);
        Assert.Equal(TestHelpers.DefaultFiksIOSettings, fiksIOSettings);
        Assert.IsType<FiksIOClient>(fiksIOClient);
        Assert.IsType<FiksIOClientFactory>(fiksIOClientFactory);
        Assert.IsType<AltinnCdnClient>(altinnCdnClient);
        Assert.IsType<FiksArkivHost>(fiksArkivHost);
        Assert.IsType<FiksArkivServiceTask>(fiksArkivServiceTask);
        Assert.IsType<FiksArkivConfigValidationService>(fiksArkivConfigValidationService);
        Assert.IsType<FiksArkivConfigResolver>(fiksArkivConfigResolver);
        Assert.IsType<FiksArkivInstanceClient>(fiksArkivInstanceClient);
        Assert.IsType<FiksArkivDefaultPayloadGenerator>(fiksArkivPayloadGenerator);
        Assert.IsType<FiksArkivDefaultResponseHandler>(fiksArkivResponseHandler);

        AssertDefaultResiliencePipeline(resiliencePipeline);
    }

    [Fact]
    public async Task AddFiksArkiv_OverridesResiliencePipeline()
    {
        // Arrange
        var pipelineOverride = (
            ResiliencePipelineBuilder<FiksIOMessageResponse> builder,
            AddResiliencePipelineContext<string> context
        ) =>
        {
            builder.AddRetry(new RetryStrategyOptions<FiksIOMessageResponse> { MaxRetryAttempts = int.MaxValue });
        };

        await using var fixture = TestFixture.Create(services =>
            services.AddFiksArkiv().WithResiliencePipeline(pipelineOverride)
        );

        // Act
        var resiliencePipeline = fixture.FiksIOResiliencePipeline;
        var resiliencePipelineDescriptor = resiliencePipeline.GetPipelineDescriptor();

        // Assert
        Assert.NotNull(resiliencePipeline);
        Assert.Single(resiliencePipelineDescriptor.Strategies);
        var retryOptions = Assert.IsType<RetryStrategyOptions<FiksIOMessageResponse>>(
            resiliencePipelineDescriptor.Strategies[0].Options
        );
        Assert.Equal(int.MaxValue, retryOptions.MaxRetryAttempts);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task AddFiksArkiv_OverridesConfig_Delegates(bool provideDefaultSettings)
    {
        // Arrange
        var fiksIOSettingsOverride = TestHelpers.RandomFiksIOSettings;
        var fiksArkivSettingsOverride = TestHelpers.RandomFiksArkivSettings;
        var maskinportenSettingsOverride = TestHelpers.RandomMaskinportenSettings;
        await using var fixture = TestFixture.Create(
            services =>
                services
                    .AddFiksArkiv()
                    .WithFiksIOConfig(x =>
                    {
                        x.AccountId = fiksIOSettingsOverride.AccountId;
                        x.IntegrationId = fiksIOSettingsOverride.IntegrationId;
                        x.IntegrationPassword = fiksIOSettingsOverride.IntegrationPassword;
                        x.AccountPrivateKeyBase64 = fiksIOSettingsOverride.AccountPrivateKeyBase64;
                        x.AmqpHost = fiksIOSettingsOverride.AmqpHost;
                        x.ApiHost = fiksIOSettingsOverride.ApiHost;
                    })
                    .WithFiksArkivConfig(x =>
                    {
                        x.ErrorHandling = fiksArkivSettingsOverride.ErrorHandling;
                        x.SuccessHandling = fiksArkivSettingsOverride.SuccessHandling;
                        x.Metadata = fiksArkivSettingsOverride.Metadata;
                        x.Documents = fiksArkivSettingsOverride.Documents;
                        x.Recipient = fiksArkivSettingsOverride.Recipient;
                        x.Receipt = fiksArkivSettingsOverride.Receipt;
                    })
                    .WithMaskinportenConfig(x =>
                    {
                        x.Authority = maskinportenSettingsOverride.Authority;
                        x.ClientId = maskinportenSettingsOverride.ClientId;
                        x.JwkBase64 = maskinportenSettingsOverride.JwkBase64;
                    }),
            useDefaultFiksIOSettings: provideDefaultSettings,
            useDefaultFiksArkivSettings: provideDefaultSettings,
            useDefaultMaskinportenSettings: provideDefaultSettings
        );

        // Act
        var fiksIOSettings = fixture.FiksIOSettings;
        var fiksArkivSettings = fixture.FiksArkivSettings;
        var maskinportenSettings = fixture.MaskinportenSettings;

        // Assert
        Assert.NotNull(fiksIOSettings);
        Assert.NotNull(fiksArkivSettings);
        Assert.NotNull(maskinportenSettings);
        Assert.Equivalent(fiksArkivSettingsOverride, fiksArkivSettings);
        Assert.Equal(fiksIOSettingsOverride, fiksIOSettings);
        Assert.Equal(maskinportenSettingsOverride, maskinportenSettings);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task AddFiksArkiv_OverridesConfig_JsonPaths(bool provideDefaultSettings)
    {
        // Arrange
        var fiksIOSettingsOverride = TestHelpers.RandomFiksIOSettings;
        var fiksArkivSettingsOverride = TestHelpers.RandomFiksArkivSettings;
        var maskinportenSettingsOverride = TestHelpers.RandomMaskinportenSettings;
        await using var fixture = TestFixture.Create(
            services =>
                services
                    .AddFiksArkiv()
                    .WithFiksIOConfig("SuperCustomFiksIOSettings")
                    .WithFiksArkivConfig("SuperCustomFiksArkivSettings")
                    .WithMaskinportenConfig("SuperCustomMaskinportenSettings"),
            [
                ("SuperCustomFiksIOSettings", fiksIOSettingsOverride),
                ("SuperCustomFiksArkivSettings", fiksArkivSettingsOverride),
                ("SuperCustomMaskinportenSettings", maskinportenSettingsOverride),
            ],
            useDefaultFiksIOSettings: provideDefaultSettings,
            useDefaultFiksArkivSettings: provideDefaultSettings,
            useDefaultMaskinportenSettings: provideDefaultSettings
        );

        // Act
        var fiksIOSettings = fixture.FiksIOSettings;
        var fiksArkivSettings = fixture.FiksArkivSettings;
        var maskinportenSettings = fixture.MaskinportenSettings;

        // Assert
        Assert.NotNull(fiksIOSettings);
        Assert.NotNull(fiksArkivSettings);
        Assert.NotNull(maskinportenSettings);
        Assert.Equivalent(fiksArkivSettingsOverride, fiksArkivSettings);
        Assert.Equal(fiksIOSettingsOverride, fiksIOSettings);
        Assert.Equal(maskinportenSettingsOverride, maskinportenSettings);
    }

    [Fact]
    public async Task AddFiksArkiv_OverridesPayloadGenerator()
    {
        // Arrange
        await using var fixture = TestFixture.Create(services =>
            services.AddFiksArkiv().WithPayloadGenerator<TestHelpers.CustomFiksArkivPayloadGenerator>()
        );

        // Act
        var fiksArkivMessageHandler = fixture.FiksArkivPayloadGenerator;

        // Assert
        Assert.NotNull(fiksArkivMessageHandler);
        Assert.IsType<TestHelpers.CustomFiksArkivPayloadGenerator>(fiksArkivMessageHandler);
    }

    [Fact]
    public async Task AddFiksArkiv_OverridesResponseHandler()
    {
        // Arrange
        await using var fixture = TestFixture.Create(services =>
            services.AddFiksArkiv().WithResponseHandler<TestHelpers.CustomFiksArkivResponseHandler>()
        );

        // Act
        var fiksArkivMessageHandler = fixture.FiksArkivResponseHandler;

        // Assert
        Assert.NotNull(fiksArkivMessageHandler);
        Assert.IsType<TestHelpers.CustomFiksArkivResponseHandler>(fiksArkivMessageHandler);
    }

    private static void AssertDefaultResiliencePipeline(ResiliencePipeline<FiksIOMessageResponse> pipeline)
    {
        var pipelineDescriptor = pipeline.GetPipelineDescriptor();

        Assert.Equal(2, pipelineDescriptor.Strategies.Count);
        var retryOptions = Assert.IsType<RetryStrategyOptions<FiksIOMessageResponse>>(
            pipelineDescriptor.Strategies[0].Options
        );
        var timeoutOptions = Assert.IsType<TimeoutStrategyOptions>(pipelineDescriptor.Strategies[1].Options);
        Assert.Equal(5, retryOptions.MaxRetryAttempts);
        Assert.Equal(TimeSpan.FromSeconds(10), retryOptions.MaxDelay);
        Assert.Equal(TimeSpan.FromSeconds(1), retryOptions.Delay);
        Assert.Equal(DelayBackoffType.Exponential, retryOptions.BackoffType);
        Assert.Equal(TimeSpan.FromSeconds(2), timeoutOptions.Timeout);
    }
}
