using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Maskinporten.Extensions;
using Altinn.App.Core.Features.Maskinporten.Models;
using Altinn.App.Core.Internal;
using Altinn.App.Core.Internal.ProvisionedSecrets;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Tests.Features.Maskinporten;

/// <summary>
/// Maskinporten as a tenant of the provisioned secrets channel: what an app's
/// <see cref="MaskinportenSettings"/> bind to, and what they refuse to bind to.
/// </summary>
public sealed class MaskinportenSettingsProvisioningTests
{
    private static readonly ProvisionedSecretFile _file = ProvisionedSecretFiles.Maskinporten;

    [Fact]
    public async Task Options_BindTheProvisionedFile()
    {
        using var tempDirectory = new TempDirectory();
        await WriteSettings(tempDirectory.Path, "provisioned-client");

        await using var serviceProvider = BuildOptionsProvider(tempDirectory.Path);

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

        await using var serviceProvider = BuildOptionsProvider(
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

        await using var serviceProvider = BuildOptionsProvider(tempDirectory.Path);

        var exception = Assert.Throws<OptionsValidationException>(() =>
            serviceProvider.GetRequiredService<IOptions<MaskinportenSettings>>().Value
        );
        // The failure names the place the platform provisions into, not a field, and points a developer who
        // hits it on their own machine at the tool that provisions locally.
        Assert.Contains(Path.Join(tempDirectory.Path, _file.FileName), exception.Message, StringComparison.Ordinal);
        Assert.Contains("where the platform provisions them", exception.Message, StringComparison.Ordinal);
        Assert.Contains("studioctl app maskinporten set", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Options_FailValidationFieldByField_WhenTheFileIsIncomplete()
    {
        // A partial file is a different problem from a missing one, and the data annotations describe it.
        using var tempDirectory = new TempDirectory();
        await File.WriteAllTextAsync(
            Path.Join(tempDirectory.Path, _file.FileName),
            """{ "MaskinportenSettings": { "clientId": "half-a-client" } }"""
        );

        await using var serviceProvider = BuildOptionsProvider(tempDirectory.Path);

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

        await using var serviceProvider = BuildOptionsProvider(tempDirectory.Path);
        var options = serviceProvider.GetRequiredService<IOptionsMonitor<MaskinportenSettings>>();
        Assert.Equal("client-before", options.CurrentValue.ClientId);

        await WriteSettings(tempDirectory.Path, "client-after", DateTime.UtcNow.AddMinutes(1));

        await Wait.Until(() => TryReadClientId(options) == "client-after", TimeSpan.FromSeconds(30));
    }

    /// <summary>
    /// On localtest studioctl provisions the credentials the way the operator does in a cluster, and names the
    /// directory it provisions into. That is how a developer tests a real Maskinporten integration from a local
    /// run without the credentials ever entering the app's configuration.
    /// </summary>
    [Fact]
    public async Task Options_ReadTheStudioctlDirectory_OnLocaltest()
    {
        using var tempDirectory = new TempDirectory();
        await WriteSettings(tempDirectory.Path, "developers-own-client");

        await using var serviceProvider = BuildAppProvider(
            hostName: "local.altinn.cloud",
            (StudioctlAppEnvironment.AppSecretsDirectoryKey, tempDirectory.Path)
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
        await using var serviceProvider = BuildAppProvider(
            hostName: "local.altinn.cloud",
            ("MaskinportenSettings:authority", "https://test.maskinporten.no/"),
            ("MaskinportenSettings:clientId", "developers-own-client")
        );

        Assert.Throws<OptionsValidationException>(() =>
            serviceProvider.GetRequiredService<IOptions<MaskinportenSettings>>().Value
        );
    }

    /// <summary>
    /// studioctl named a directory but nothing has been stored there yet - the state a developer is in the
    /// first time their integration asks for a token. The failure says exactly what to run, and not where.
    /// </summary>
    [Fact]
    public async Task Options_NameTheStudioctlCommand_WhenTheStudioctlDirectoryIsEmpty()
    {
        using var tempDirectory = new TempDirectory();

        await using var serviceProvider = BuildAppProvider(
            hostName: "local.altinn.cloud",
            (StudioctlAppEnvironment.AppSecretsDirectoryKey, tempDirectory.Path)
        );

        var exception = Assert.Throws<OptionsValidationException>(() =>
            serviceProvider.GetRequiredService<IOptions<MaskinportenSettings>>().Value
        );
        Assert.Contains(
            "No Maskinporten client is stored for this local run",
            exception.Message,
            StringComparison.Ordinal
        );
        Assert.Contains("studioctl app maskinporten set", exception.Message, StringComparison.Ordinal);
        // Where studioctl keeps the file is not the developer's concern; naming it would invite hand edits.
        Assert.DoesNotContain(tempDirectory.Path, exception.Message, StringComparison.Ordinal);
    }

    /// <summary>
    /// The Maskinporten options as an app binds them, through the real registration, for a given platform
    /// hostname and app configuration. Nothing is provisioned at the cluster's location - which is the
    /// situation on a developer's machine.
    /// </summary>
    private static ServiceProvider BuildAppProvider(
        string hostName,
        params (string Key, string? Value)[] appConfiguration
    )
    {
        var services = new ServiceCollection();
        services.AddSingleton<IConfiguration>(ConfigurationWith(appConfiguration));
        services.AddRuntimeEnvironment();
        services.Configure<GeneralSettings>(options => options.HostName = hostName);
        services.Configure<PlatformSettings>(_ => { });
        services.AddMaskinportenSettings();

        return services.BuildStrictServiceProvider();
    }

    /// <summary>
    /// The Maskinporten options exactly as an app binds them, for secrets provisioned into
    /// <paramref name="secretsDirectory"/> and an app configuration of <paramref name="appConfiguration"/>.
    /// Registering the channel first is the only way to move the directory - an app has no such lever.
    /// </summary>
    private static ServiceProvider BuildOptionsProvider(
        string secretsDirectory,
        params (string Key, string? Value)[] appConfiguration
    )
    {
        var services = new ServiceCollection();
        services.AddSingleton<IConfiguration>(ConfigurationWith(appConfiguration));
        services.AddSingleton(_ => new ProvisionedSecrets(secretsDirectory, ProvisionedSecretFiles.All));
        services.AddMaskinportenSettings();

        return services.BuildStrictServiceProvider();
    }

    private static IConfigurationRoot ConfigurationWith(params (string Key, string? Value)[] values) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(values.Select(value => new KeyValuePair<string, string?>(value.Key, value.Value)))
            .Build();

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
        string path = Path.Join(secretsDirectory, _file.FileName);
        await File.WriteAllTextAsync(
            path,
            $$"""
            {
              "MaskinportenSettings": {
                "authority": "https://test.maskinporten.no/",
                "clientId": "{{clientId}}"
              }
            }
            """
        );

        if (lastWriteTimeUtc is not null)
        {
            // The polling watcher compares write times, so a rotation needs one that is visibly newer.
            File.SetLastWriteTimeUtc(path, lastWriteTimeUtc.Value);
        }
    }

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
