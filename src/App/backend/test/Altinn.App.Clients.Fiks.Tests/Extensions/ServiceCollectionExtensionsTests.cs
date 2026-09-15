using Altinn.App.Clients.Fiks.Extensions;
using Altinn.App.Clients.Fiks.FiksArkiv;
using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Clients.Fiks.FiksIO;
using Altinn.App.Clients.Fiks.FiksIO.Models;
using Altinn.App.Core.Internal.AltinnCdn;
using Moq;

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

        // Assert
        Assert.NotNull(fiksIOClient);
        Assert.NotNull(fiksIOSettings);
        Assert.IsType<FiksIOClient>(fiksIOClient);
        Assert.Equal(TestHelpers.DefaultFiksIOSettings, fiksIOSettings);
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
        var altinnCdnClient = fixture.AltinnCdnClient;
        var fiksArkivSubscriber = fixture.FiksArkivSubscriber;
        var fiksArkivMessageSender = fixture.FiksArkivMessageSender;
        var fiksArkivServiceTask = fixture.FiksArkivServiceTask;
        var fiksArkivConfigValidationService = fixture.FiksArkivConfigValidationService;
        var fiksArkivConfigResolver = fixture.FiksArkivConfigResolver;
        var fiksArkivInstanceClient = fixture.FiksArkivInstanceClient;
        var fiksArkivPayloadGenerator = fixture.FiksArkivPayloadGenerator;

        // Assert
        Assert.NotNull(fiksIOClient);
        Assert.NotNull(fiksIOSettings);
        Assert.NotNull(fiksIOClientFactory);
        Assert.NotNull(altinnCdnClient);
        Assert.NotNull(fiksArkivSubscriber);
        Assert.NotNull(fiksArkivMessageSender);
        Assert.NotNull(fiksArkivServiceTask);
        Assert.NotNull(fiksArkivConfigValidationService);
        Assert.NotNull(fiksArkivConfigResolver);
        Assert.NotNull(fiksArkivInstanceClient);
        Assert.NotNull(fiksArkivPayloadGenerator);
        // No message handler is registered by default — the hook is optional.
        Assert.Null(fixture.FiksArkivMessageHandler);
        Assert.Equal(TestHelpers.DefaultFiksIOSettings, fiksIOSettings);
        Assert.IsType<FiksIOClient>(fiksIOClient);
        Assert.IsType<FiksIOClientFactory>(fiksIOClientFactory);
        Assert.IsType<AltinnCdnClient>(altinnCdnClient);
        Assert.IsType<FiksArkivMessageSender>(fiksArkivMessageSender);
        Assert.IsType<FiksArkivServiceTask>(fiksArkivServiceTask);
        Assert.IsType<FiksArkivConfigValidationService>(fiksArkivConfigValidationService);
        Assert.IsType<FiksArkivConfigResolver>(fiksArkivConfigResolver);
        Assert.IsType<FiksArkivInstanceClient>(fiksArkivInstanceClient);
        Assert.IsType<FiksArkivDefaultPayloadGenerator>(fiksArkivPayloadGenerator);
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
    public async Task AddFiksArkiv_RegistersMessageHandler()
    {
        // Arrange
        await using var fixture = TestFixture.Create(services =>
            services.AddFiksArkiv().WithMessageHandler<TestHelpers.CustomFiksArkivMessageHandler>()
        );

        // Act
        var fiksArkivMessageHandler = fixture.FiksArkivMessageHandler;

        // Assert
        Assert.NotNull(fiksArkivMessageHandler);
        Assert.IsType<TestHelpers.CustomFiksArkivMessageHandler>(fiksArkivMessageHandler);
    }
}
