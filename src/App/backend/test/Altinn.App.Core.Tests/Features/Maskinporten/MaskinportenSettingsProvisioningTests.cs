using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Maskinporten.Extensions;
using Altinn.App.Core.Features.Maskinporten.Models;
using Altinn.App.Core.Internal;
using Altinn.App.Core.Internal.ProvisionedSecrets;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Tests.Features.Maskinporten;

/// <summary>
/// Maskinporten as a tenant of the provisioned secrets channel: what an app's
/// <see cref="MaskinportenSettings"/> bind to, and what they refuse to bind to.
/// </summary>
public sealed class MaskinportenSettingsProvisioningTests
{
    private const string _fileName = "maskinporten-settings.json";
    private const string _platformHostName = "at22.altinn.cloud";
    private const string _localtestHostName = "local.altinn.cloud";

    private static readonly ProvisionedSecretFile _file = ProvisionedSecretFiles.Maskinporten;

    [Fact]
    public async Task Options_BindTheProvisionedFile()
    {
        using var tempDirectory = new TempDirectory();
        await WriteSettings(tempDirectory.Path, "provisioned-client");

        await using var serviceProvider = BuildAppProvider(_platformHostName, tempDirectory.Path);

        var settings = serviceProvider.GetRequiredService<IOptions<MaskinportenSettings>>().Value;
        Assert.Equal("provisioned-client", settings.ClientId);
        Assert.Equal("https://test.maskinporten.no/", settings.Authority);
    }

    [Fact]
    public async Task Options_IgnoreAnyMaskinportenInputInTheAppConfiguration()
    {
        // The whole point of the private channel: an app cannot supply, extend or displace the credentials the
        // platform provisions, no matter what it puts in its own configuration. The v8 keys are spelled out
        // because an upgrading app still has them in its appsettings.json, and they must be inert.
        using var tempDirectory = new TempDirectory();
        await WriteSettings(tempDirectory.Path, "provisioned-client");

        await using var serviceProvider = BuildAppProvider(
            _platformHostName,
            tempDirectory.Path,
            ("MaskinportenSettings:clientId", "app-supplied-client"),
            ("MaskinportenSettings:jwkBase64", "app-supplied-key"),
            ("MaskinportenSettingsFilepath", "/app/an-identity-of-my-own.json"),
            ("AppSettings:RuntimeSecretsDirectory", "/app/secrets-of-my-own")
        );

        var settings = serviceProvider.GetRequiredService<IOptions<MaskinportenSettings>>().Value;
        Assert.Equal("provisioned-client", settings.ClientId);
        Assert.Null(settings.JwkBase64);
    }

    [Fact]
    public async Task Options_FailValidation_WhenNothingIsProvisioned()
    {
        using var tempDirectory = new TempDirectory();

        await using var serviceProvider = BuildAppProvider(_platformHostName, tempDirectory.Path);

        var exception = Assert.Throws<OptionsValidationException>(() =>
            serviceProvider.GetRequiredService<IOptions<MaskinportenSettings>>().Value
        );
        // The failure names the place the platform provisions into, not a field, and points a developer who
        // hits it on their own machine at the tool that provisions locally.
        Assert.Contains(Path.Join(tempDirectory.Path, _fileName), exception.Message, StringComparison.Ordinal);
        Assert.Contains("where the platform provisions them", exception.Message, StringComparison.Ordinal);
        Assert.Contains("studioctl app maskinporten set", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Options_FailValidationFieldByField_WhenTheFileIsIncomplete()
    {
        // A partial file is a different problem from a missing one, and the data annotations describe it.
        using var tempDirectory = new TempDirectory();
        await File.WriteAllTextAsync(
            Path.Join(tempDirectory.Path, _fileName),
            """{ "MaskinportenSettings": { "clientId": "half-a-client" } }"""
        );

        await using var serviceProvider = BuildAppProvider(_platformHostName, tempDirectory.Path);

        var exception = Assert.Throws<OptionsValidationException>(() =>
            serviceProvider.GetRequiredService<IOptions<MaskinportenSettings>>().Value
        );
        Assert.Contains("Authority", exception.Message, StringComparison.Ordinal);
        Assert.DoesNotContain("studioctl", exception.Message, StringComparison.Ordinal);
    }

    /// <summary>
    /// Operator key rotation reaches a running app: the channel polls, and the change token it publishes is
    /// what <see cref="IOptionsMonitor{TOptions}"/> rebinds on.
    /// </summary>
    [Fact]
    public async Task Options_Reload_WhenTheProvisionedFileIsRotated()
    {
        using var tempDirectory = new TempDirectory();
        await WriteSettings(tempDirectory.Path, "client-before");

        await using var serviceProvider = BuildAppProvider(_platformHostName, tempDirectory.Path);
        var options = serviceProvider.GetRequiredService<IOptionsMonitor<MaskinportenSettings>>();
        Assert.Equal("client-before", options.CurrentValue.ClientId);

        await WriteSettings(tempDirectory.Path, "client-after", DateTime.UtcNow.AddMinutes(1));

        await Wait.Until(() => TryReadClientId(options) == "client-after", TimeSpan.FromSeconds(30));
    }

    /// <summary>
    /// The credentials come from wherever the platform put them, under whatever it called the file. On
    /// localtest that is studioctl's doing, and the app is none the wiser.
    /// </summary>
    [Fact]
    public async Task Options_ReadTheFileWherePlatformSaysItIs()
    {
        using var tempDirectory = new TempDirectory();
        await File.WriteAllTextAsync(
            Path.Join(tempDirectory.Path, "a-name-studioctl-chose.json"),
            SettingsJson("developers-own-client")
        );

        await using var serviceProvider = BuildAppProvider(
            _localtestHostName,
            tempDirectory.Path,
            fileName: "a-name-studioctl-chose.json"
        );

        var settings = serviceProvider.GetRequiredService<IOptions<MaskinportenSettings>>().Value;
        Assert.Equal("developers-own-client", settings.ClientId);
    }

    /// <summary>
    /// A MaskinportenSettings section in the app's own configuration is not a Maskinporten surface anywhere,
    /// localtest included: the provisioned file is the only input, so there is never a section name to get right.
    /// </summary>
    [Fact]
    public async Task Options_IgnoreAMaskinportenSection_OnLocaltest()
    {
        using var tempDirectory = new TempDirectory();

        await using var serviceProvider = BuildAppProvider(
            _localtestHostName,
            tempDirectory.Path,
            ("MaskinportenSettings:authority", "https://test.maskinporten.no/"),
            ("MaskinportenSettings:clientId", "developers-own-client")
        );

        Assert.Throws<OptionsValidationException>(() =>
            serviceProvider.GetRequiredService<IOptions<MaskinportenSettings>>().Value
        );
    }

    /// <summary>
    /// The platform provisioned a directory but no client - the state a developer is in before they have
    /// stored one. On localtest the failure says exactly what to run, and not where: where studioctl keeps
    /// the client is studioctl's business, and naming it would invite hand edits.
    /// </summary>
    [Fact]
    public async Task Options_NameTheStudioctlCommand_WhenNothingIsStoredLocally()
    {
        using var tempDirectory = new TempDirectory();

        await using var serviceProvider = BuildAppProvider(_localtestHostName, tempDirectory.Path);

        var exception = Assert.Throws<OptionsValidationException>(() =>
            serviceProvider.GetRequiredService<IOptions<MaskinportenSettings>>().Value
        );
        Assert.Contains(
            "No Maskinporten client is stored for this local run",
            exception.Message,
            StringComparison.Ordinal
        );
        Assert.Contains("studioctl app maskinporten set", exception.Message, StringComparison.Ordinal);
        Assert.DoesNotContain(tempDirectory.Path, exception.Message, StringComparison.Ordinal);
    }

    /// <summary>
    /// Every app has a provisioned Maskinporten client, so an app with none does not start: the failure is a
    /// deployment problem an operator sees, not a token request that fails hours in.
    /// </summary>
    [Fact]
    public async Task Host_DoesNotStart_WhenNothingIsProvisioned()
    {
        using var tempDirectory = new TempDirectory();
        using IHost host = BuildAppHost(_localtestHostName, tempDirectory.Path);

        var exception = await Assert.ThrowsAsync<OptionsValidationException>(() => host.StartAsync());

        Assert.Contains("studioctl app maskinporten set", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Host_Starts_WhenTheClientIsProvisioned()
    {
        using var tempDirectory = new TempDirectory();
        await WriteSettings(tempDirectory.Path, "provisioned-client");
        using IHost host = BuildAppHost(_localtestHostName, tempDirectory.Path);

        await host.StartAsync();
        await host.StopAsync();

        var settings = host.Services.GetRequiredService<IOptions<MaskinportenSettings>>().Value;
        Assert.Equal("provisioned-client", settings.ClientId);
    }

    /// <summary>
    /// The Maskinporten options exactly as an app binds them, through the real registration: the platform
    /// names the secrets directory and the file, and the app's own configuration adds
    /// <paramref name="appConfiguration"/> on top - which is the thing that must never reach the credentials.
    /// </summary>
    private static ServiceProvider BuildAppProvider(
        string hostName,
        string secretsDirectory,
        params (string Key, string? Value)[] appConfiguration
    ) => BuildAppProvider(hostName, secretsDirectory, _fileName, appConfiguration);

    private static ServiceProvider BuildAppProvider(
        string hostName,
        string secretsDirectory,
        string fileName,
        params (string Key, string? Value)[] appConfiguration
    )
    {
        var services = new ServiceCollection();
        services.AddSingleton<IConfiguration>(
            new ConfigurationBuilder()
                .AddInMemoryCollection(ConfigurationWith(secretsDirectory, fileName, appConfiguration))
                .Build()
        );
        AddMaskinportenTenant(services, hostName);

        return services.BuildStrictServiceProvider();
    }

    /// <summary>
    /// The same registration inside a host, so that startup validation runs.
    /// </summary>
    private static IHost BuildAppHost(string hostName, string secretsDirectory)
    {
        HostApplicationBuilder builder = Host.CreateEmptyApplicationBuilder(new HostApplicationBuilderSettings());
        builder.Configuration.AddInMemoryCollection(ConfigurationWith(secretsDirectory, _fileName, []));
        builder.Services.AddLogging();
        AddMaskinportenTenant(builder.Services, hostName);

        return builder.Build();
    }

    private static void AddMaskinportenTenant(IServiceCollection services, string hostName)
    {
        services.AddRuntimeEnvironment();
        services.Configure<GeneralSettings>(options => options.HostName = hostName);
        services.Configure<PlatformSettings>(_ => { });
        services.AddMaskinportenSettings();
    }

    /// <summary>
    /// The app's configuration: the variables the platform sets, plus whatever the app itself supplies.
    /// </summary>
    private static IEnumerable<KeyValuePair<string, string?>> ConfigurationWith(
        string secretsDirectory,
        string fileName,
        (string Key, string? Value)[] appConfiguration
    ) =>
        [
            new(ProvisionedSecrets.DirectoryKey, secretsDirectory),
            new(_file.FileNameKey, fileName),
            .. appConfiguration.Select(value => new KeyValuePair<string, string?>(value.Key, value.Value)),
        ];

    /// <summary>
    /// The configured client id, or <c>null</c> while the settings are still unreadable — polling for a file
    /// that has not appeared yet means reading options that do not validate.
    /// </summary>
    private static string? TryReadClientId(IOptionsMonitor<MaskinportenSettings> options)
    {
        try
        {
            return options.CurrentValue.ClientId;
        }
        catch (OptionsValidationException)
        {
            return null;
        }
    }

    private static async Task WriteSettings(string secretsDirectory, string clientId, DateTime? lastWriteTimeUtc = null)
    {
        string path = Path.Join(secretsDirectory, _fileName);
        await File.WriteAllTextAsync(path, SettingsJson(clientId));

        if (lastWriteTimeUtc is not null)
        {
            // The polling watcher compares write times, so a rotation needs one that is visibly newer.
            File.SetLastWriteTimeUtc(path, lastWriteTimeUtc.Value);
        }
    }

    private static string SettingsJson(string clientId) =>
        $$"""
            {
              "MaskinportenSettings": {
                "authority": "https://test.maskinporten.no/",
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
}
