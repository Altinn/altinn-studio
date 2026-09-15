using Altinn.App.Api.Extensions;
using Altinn.App.Api.Tests.Extensions;
using Altinn.App.Core.Features.Maskinporten;
using Altinn.App.Core.Features.Maskinporten.Constants;
using Altinn.App.Core.Features.Maskinporten.Delegates;
using Altinn.App.Core.Features.Maskinporten.Models;
using Altinn.App.Core.Models;
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
    public async Task ProvisionedSettingsFile_IsWhatTheClientAuthenticatesWith()
    {
        // Arrange - the platform mounts the credentials as a file; this is the only way in
        using var secretsDirectory = new TempDirectory();
        string settingsPath = Path.Join(secretsDirectory.Path, "maskinporten-settings.json");
        await File.WriteAllTextAsync(settingsPath, SettingsJson("provisioned-client"));

        // Act - RegisterCustomAppServices runs before AddAltinnAppServices, so this source wins the TryAdd
        var app = AppBuilder.Build(registerCustomAppServices: services =>
            services.AddSingleton(_ => new MaskinportenSettingsSource(settingsPath))
        );

        // Assert
        var settings = app.Services.GetRequiredService<IOptionsMonitor<MaskinportenSettings>>().CurrentValue;
        Assert.Equal("provisioned-client", settings.ClientId);
        Assert.Equal("https://maskinporten.dev/", settings.Authority);
    }

    [Fact]
    public async Task AppConfiguration_CannotChangeTheProvisionedIdentity()
    {
        // Arrange - an app supplying its own MaskinportenSettings section, the pre-v9 hazard
        using var secretsDirectory = new TempDirectory();
        string settingsPath = Path.Join(secretsDirectory.Path, "maskinporten-settings.json");
        await File.WriteAllTextAsync(settingsPath, SettingsJson("provisioned-client"));

        // Act
        var app = AppBuilder.Build(
            configData:
            [
                new("MaskinportenSettings:clientId", "app-supplied-client"),
                new("MaskinportenSettings:jwkBase64", "app-supplied-key"),
                new("MaskinportenSettingsFilepath", "/app/an-identity-of-my-own.json"),
                new("AppSettings:RuntimeSecretsDirectory", "/app/secrets-of-my-own"),
            ],
            registerCustomAppServices: services =>
                services.AddSingleton(_ => new MaskinportenSettingsSource(settingsPath))
        );

        // Assert - the app's section is not a Maskinporten configuration surface at all
        var settings = app.Services.GetRequiredService<IOptionsMonitor<MaskinportenSettings>>().CurrentValue;
        Assert.Equal("provisioned-client", settings.ClientId);
        Assert.Null(settings.JwkBase64);
    }

    private static string SettingsJson(string clientId) =>
        $$"""
            {
              "MaskinportenSettings": {
                "authority": "https://maskinporten.dev/",
                "clientId": "{{clientId}}"
              }
            }
            """;

    private sealed class TempDirectory : IDisposable
    {
        public TempDirectory() => Path = Directory.CreateTempSubdirectory().FullName;

        public string Path { get; }

        public void Dispose()
        {
            if (Directory.Exists(Path))
            {
                Directory.Delete(Path, recursive: true);
            }
        }
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
        Assert.Equivalent(inputScopes, delegatingHandler.Request.Scopes);
        Assert.Equal(actualTokenAuthority, delegatingHandler.Authority);
    }

    [Theory]
    [InlineData(nameof(TokenAuthority.Maskinporten))]
    [InlineData(nameof(TokenAuthority.AltinnTokenExchange))]
    public void UseMaskinportenAuthorization_WithRequest_BindsRequestToHandler(string tokenAuthority)
    {
        // Arrange
        Enum.TryParse(tokenAuthority, false, out TokenAuthority actualTokenAuthority);
        var tokenRequest = new MaskinportenTokenRequest
        {
            Scopes = ["scope1", "scope2"],
            ConsumerOrg = OrganizationNumber.Parse("991825827"),
            SystemUser = new MaskinportenSystemUser
            {
                Organization = OrganizationNumber.Parse("311169963"),
                ExternalRef = "systembruker-1",
            },
        };

        var app = AppBuilder.Build(registerCustomAppServices: services =>
        {
            _ = actualTokenAuthority switch
            {
                TokenAuthority.Maskinporten => services
                    .AddHttpClient<DummyHttpClient>()
                    .UseMaskinportenAuthorization(tokenRequest),
                TokenAuthority.AltinnTokenExchange => services
                    .AddHttpClient<DummyHttpClient>()
                    .UseMaskinportenAltinnAuthorization(tokenRequest),
                _ => throw new ArgumentException($"Unknown TokenAuthority {tokenAuthority}"),
            };
        });

        // Act
        var client = app.Services.GetRequiredService<DummyHttpClient>();

        // Assert
        var delegatingHandler = client.HttpClient.GetDelegatingHandler<MaskinportenDelegatingHandler>();
        Assert.NotNull(delegatingHandler);
        Assert.Equal(tokenRequest, delegatingHandler.Request);
        Assert.Equal(actualTokenAuthority, delegatingHandler.Authority);
    }

    [Fact]
    public void UseMaskinportenAuthorization_WithNullRequest_Throws()
    {
        var builder = new ServiceCollection().AddHttpClient<DummyHttpClient>();

        Assert.Throws<ArgumentNullException>(() =>
            builder.UseMaskinportenAuthorization((MaskinportenTokenRequest)null!)
        );
        Assert.Throws<ArgumentNullException>(() =>
            builder.UseMaskinportenAltinnAuthorization((MaskinportenTokenRequest)null!)
        );
    }

    private sealed class DummyHttpClient(HttpClient client)
    {
        public HttpClient HttpClient { get; set; } = client;
    }
}
