using Altinn.App.Api.Extensions;
using Altinn.App.Api.Tests.Extensions;
using Altinn.App.Api.Tests.TestUtils;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features.Maskinporten;
using Altinn.App.Core.Features.Maskinporten.Delegates;
using Altinn.App.Core.Features.Maskinporten.Models;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Altinn.App.Api.Tests.Maskinporten;

public class MaskinportenClientIntegrationTests
{
    [Fact]
    public void ConfigureAppWebHost_AddsMaskinportenService()
    {
        var app = AppBuilder.Build();
        app.Services.GetServices<IMaskinportenClient>().Should().HaveCount(1);
    }

    [Fact]
    public void ConfigureMaskinportenClient_OverridesDefaultMaskinportenConfiguration()
    {
        // Arrange
        var clientId = "the-client-id";
        var authority = "https://maskinporten.dev/";

        // Act
        var app = AppBuilder.Build(registerCustomAppServices: services =>
        {
            services.ConfigureMaskinportenClient(config =>
            {
                config.ClientId = clientId;
                config.Authority = authority;
                config.JwkBase64 = "gibberish";
            });
        });

        // Assert
        var optionsMonitor = app.Services.GetRequiredService<IOptionsMonitor<MaskinportenSettings>>();
        Assert.NotNull(optionsMonitor);

        var settings = optionsMonitor.CurrentValue;
        Assert.NotNull(settings);

        settings.ClientId.Should().Be(clientId);
        settings.Authority.Should().Be(authority);
    }

    [Fact]
    public void ConfigureMaskinportenClient_LastConfigurationOverwritesOthers()
    {
        // Arrange
        var services = new ServiceCollection();
        var clientId = "the-client-id";
        var authority = "https://maskinporten.dev/";

        // Act
        services.ConfigureMaskinportenClient(config =>
        {
            config.ClientId = "this should be overwritten";
            config.Authority = "ditto";
            config.JwkBase64 = "gibberish";
        });
        services.ConfigureMaskinportenClient(config =>
        {
            config.ClientId = clientId;
            config.Authority = authority;
            config.JwkBase64 = "gibberish";
        });

        // Assert
        var serviceProvider = services.BuildServiceProvider();
        var optionsMonitor = serviceProvider.GetRequiredService<IOptionsMonitor<MaskinportenSettings>>();
        Assert.NotNull(optionsMonitor);

        var settings = optionsMonitor.CurrentValue;
        Assert.NotNull(settings);

        settings.ClientId.Should().Be(clientId);
        settings.Authority.Should().Be(authority);
    }

    [Fact]
    public void ConfigureMaskinportenClient_BindsToSpecifiedConfigPath()
    {
        // Arrange
        var clientId = "the-client-id";
        var authority = "https://maskinporten.dev/";
        var jwkBase64 = "gibberish";

        List<KeyValuePair<string, string?>> configData =
        [
            new("CustomMaskinportenSettings:clientId", clientId),
            new("CustomMaskinportenSettings:authority", authority),
            new("CustomMaskinportenSettings:jwkBase64", jwkBase64),
        ];

        // Act
        var app = AppBuilder.Build(
            configData: configData,
            registerCustomAppServices: services =>
            {
                services.ConfigureMaskinportenClient("CustomMaskinportenSettings");
            }
        );

        // Assert
        var optionsMonitor = app.Services.GetRequiredService<IOptionsMonitor<MaskinportenSettings>>();
        Assert.NotNull(optionsMonitor);

        var settings = optionsMonitor.CurrentValue;
        Assert.NotNull(settings);

        settings.ClientId.Should().Be(clientId);
        settings.Authority.Should().Be(authority);
        settings.JwkBase64.Should().Be(jwkBase64);
    }

    [Theory]
    [InlineData("client1", "scope1")]
    [InlineData("client2", "scope1", "scope2", "scope3")]
    public void UseMaskinportenAuthorization_AddsHandler_BindsToSpecifiedClient(
        string scope,
        params string[] additionalScopes
    )
    {
        // Arrange
        var app = AppBuilder.Build(registerCustomAppServices: services =>
            services.AddHttpClient<DummyHttpClient>().UseMaskinportenAuthorization(scope, additionalScopes)
        );

        // Act
        var client = app.Services.GetRequiredService<DummyHttpClient>();

        // Assert
        Assert.NotNull(client);
        var delegatingHandler = client.HttpClient.GetDelegatingHandler<MaskinportenDelegatingHandler>();
        Assert.NotNull(delegatingHandler);
        var inputScopes = new[] { scope }.Concat(additionalScopes);
        delegatingHandler.Scopes.Should().BeEquivalentTo(inputScopes);
    }

    private sealed class DummyHttpClient(HttpClient client)
    {
        public HttpClient HttpClient { get; set; } = client;
    }
}
