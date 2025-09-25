using Altinn.App.Api.Extensions;
using Altinn.App.Api.Tests.Extensions;
using Altinn.App.Core.Features.Maskinporten;
using Altinn.App.Core.Features.Maskinporten.Constants;
using Altinn.App.Core.Features.Maskinporten.Delegates;
using Altinn.App.Core.Features.Maskinporten.Models;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

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
        Assert.Equal(clientId, settings.ClientId);
        Assert.Equal(authority, settings.Authority);
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
        var serviceProvider = services.BuildStrictServiceProvider();
        var optionsMonitor = serviceProvider.GetRequiredService<IOptionsMonitor<MaskinportenSettings>>();
        Assert.NotNull(optionsMonitor);

        var settings = optionsMonitor.CurrentValue;
        Assert.NotNull(settings);
        Assert.Equal(clientId, settings.ClientId);
        Assert.Equal(authority, settings.Authority);
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
        Assert.Equal(clientId, settings.ClientId);
        Assert.Equal(authority, settings.Authority);
        Assert.Equal(jwkBase64, settings.JwkBase64);
    }

    // TODO: Remove this test when the obsolete method is removed
    [Theory]
    [InlineData(nameof(TokenAuthority.Maskinporten), "client1", "scope1")]
    [InlineData(nameof(TokenAuthority.Maskinporten), "client2", "scope1", "scope2", "scope3")]
    [InlineData(nameof(TokenAuthority.AltinnTokenExchange), "doesntmatter")]
    public void UseMaskinportenAuthorisation_AddsHandler_BindsToSpecifiedClient(
        string tokenAuthority,
        string scope,
        params string[] additionalScopes
    )
    {
        // Arrange
        Enum.TryParse(tokenAuthority, false, out TokenAuthority actualTokenAuthority);
        var app = AppBuilder.Build(registerCustomAppServices: services =>
        {
            _ = actualTokenAuthority switch
            {
                TokenAuthority.Maskinporten => services
                    .AddHttpClient<DummyHttpClient>()
                    .UseMaskinportenAuthorisation(scope, additionalScopes),
                TokenAuthority.AltinnTokenExchange => services
                    .AddHttpClient<DummyHttpClient>()
                    .UseMaskinportenAltinnAuthorisation(scope, additionalScopes),
                _ => throw new ArgumentException($"Unknown TokenAuthority {tokenAuthority}"),
            };
        });

        // Act
        var client = app.Services.GetRequiredService<DummyHttpClient>();

        // Assert
        Assert.NotNull(client);
        var delegatingHandler = client.HttpClient.GetDelegatingHandler<MaskinportenDelegatingHandler>();
        Assert.NotNull(delegatingHandler);
        string[] inputScopes = [scope, .. additionalScopes];
        Assert.Equivalent(inputScopes, delegatingHandler.Scopes);
        Assert.Equal(actualTokenAuthority, delegatingHandler.Authority);
    }

    [Theory]
    [InlineData(nameof(TokenAuthority.Maskinporten), "client1", "scope1")]
    [InlineData(nameof(TokenAuthority.Maskinporten), "client2", "scope1", "scope2", "scope3")]
    [InlineData(nameof(TokenAuthority.AltinnTokenExchange), "doesntmatter")]
    public void UseMaskinportenAuthorization_AddsHandler_BindsToSpecifiedClient(
        string tokenAuthority,
        string scope,
        params string[] additionalScopes
    )
    {
        // Arrange
        Enum.TryParse(tokenAuthority, false, out TokenAuthority actualTokenAuthority);
        var app = AppBuilder.Build(registerCustomAppServices: services =>
        {
            _ = actualTokenAuthority switch
            {
                TokenAuthority.Maskinporten => services
                    .AddHttpClient<DummyHttpClient>()
                    .UseMaskinportenAuthorization(scope, additionalScopes),
                TokenAuthority.AltinnTokenExchange => services
                    .AddHttpClient<DummyHttpClient>()
                    .UseMaskinportenAltinnAuthorization(scope, additionalScopes),
                _ => throw new ArgumentException($"Unknown TokenAuthority {tokenAuthority}"),
            };
        });

        // Act
        var client = app.Services.GetRequiredService<DummyHttpClient>();

        // Assert
        Assert.NotNull(client);
        var delegatingHandler = client.HttpClient.GetDelegatingHandler<MaskinportenDelegatingHandler>();
        Assert.NotNull(delegatingHandler);
        string[] inputScopes = [scope, .. additionalScopes];
        Assert.Equivalent(inputScopes, delegatingHandler.Scopes);
        Assert.Equal(actualTokenAuthority, delegatingHandler.Authority);
    }

    private sealed class DummyHttpClient(HttpClient client)
    {
        public HttpClient HttpClient { get; set; } = client;
    }
}
