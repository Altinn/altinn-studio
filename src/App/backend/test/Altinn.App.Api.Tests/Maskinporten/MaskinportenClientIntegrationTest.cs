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
        // Arrange - the platform mounts the credentials as a file and says where; this is the only way in
        using var secretsDirectory = new TempDirectory();
        await WriteProvisionedClient(secretsDirectory.Path, "provisioned-client");

        // Act
        var app = AppBuilder.Build(configData: ProvisionedSecretsTestEnvironment.VariablesFor(secretsDirectory.Path));

        // Assert
        var settings = app.Services.GetRequiredService<IOptionsMonitor<MaskinportenSettings>>().CurrentValue;
        Assert.Equal("provisioned-client", settings.ClientId);
        Assert.Equal("https://test.maskinporten.no/", settings.Authority);
    }

    [Fact]
    public async Task AppConfiguration_CannotChangeTheProvisionedIdentity()
    {
        // Arrange - an app supplying its own MaskinportenSettings section, the pre-v9 hazard
        using var secretsDirectory = new TempDirectory();
        await WriteProvisionedClient(secretsDirectory.Path, "provisioned-client");

        // Act
        var app = AppBuilder.Build(
            configData:
            [
                .. ProvisionedSecretsTestEnvironment.VariablesFor(secretsDirectory.Path),
                new("MaskinportenSettings:clientId", "app-supplied-client"),
                new("MaskinportenSettings:jwkBase64", "app-supplied-key"),
                new("MaskinportenSettingsFilepath", "/app/an-identity-of-my-own.json"),
                new("AppSettings:RuntimeSecretsDirectory", "/app/secrets-of-my-own"),
            ]
        );

        // Assert - the app's section is not a Maskinporten configuration surface at all
        var settings = app.Services.GetRequiredService<IOptionsMonitor<MaskinportenSettings>>().CurrentValue;
        Assert.Equal("provisioned-client", settings.ClientId);
        Assert.Null(settings.JwkBase64);
    }

    /// <summary>
    /// Every app has a provisioned Maskinporten client, so an app given none does not start at all: an
    /// operator sees a deployment that failed, rather than a token request that fails hours later.
    /// </summary>
    [Fact]
    public async Task Host_DoesNotStart_WhenNoClientIsProvisioned()
    {
        using var secretsDirectory = new TempDirectory();

        await using var app = AppBuilder.Build(configData: HostConfiguration(secretsDirectory.Path));

        var exception = await Assert.ThrowsAsync<OptionsValidationException>(() => app.StartAsync());
        Assert.Contains("studioctl app maskinporten set", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Host_Starts_WhenTheClientIsProvisioned()
    {
        using var secretsDirectory = new TempDirectory();
        await WriteProvisionedClient(secretsDirectory.Path, "provisioned-client");

        await using var app = AppBuilder.Build(configData: HostConfiguration(secretsDirectory.Path));

        await app.StartAsync();
        await app.StopAsync();

        var settings = app.Services.GetRequiredService<IOptionsMonitor<MaskinportenSettings>>().CurrentValue;
        Assert.Equal("provisioned-client", settings.ClientId);
    }

    /// <summary>
    /// What an app host needs besides its provisioned secrets before it will start: an ephemeral port, no
    /// localtest probing, and the callback app code the workflow engine integration validates at startup.
    /// </summary>
    /// <param name="secretsDirectory">The directory standing in for the platform's secrets mount.</param>
    private static IEnumerable<KeyValuePair<string, string?>> HostConfiguration(string secretsDirectory) =>
        [
            .. ProvisionedSecretsTestEnvironment.VariablesFor(secretsDirectory),
            new("urls", "http://127.0.0.1:0"),
            new("GeneralSettings:DisableLocaltestValidation", "true"),
            new("AppCodes:WorkflowEngineCallback:0:Id", "test"),
            new("AppCodes:WorkflowEngineCallback:0:Code", "test-workflow-engine-callback-secret-long-enough"),
            new("AppCodes:WorkflowEngineCallback:0:IssuedAt", "2020-01-01T00:00:00Z"),
            new("AppCodes:WorkflowEngineCallback:0:ExpiresAt", "2999-01-01T00:00:00Z"),
        ];

    private static Task WriteProvisionedClient(string secretsDirectory, string clientId) =>
        File.WriteAllTextAsync(
            Path.Join(secretsDirectory, ProvisionedSecretsTestEnvironment.MaskinportenFileName),
            ProvisionedSecretsTestEnvironment.CreateMaskinportenSettingsJson(clientId)
        );

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
