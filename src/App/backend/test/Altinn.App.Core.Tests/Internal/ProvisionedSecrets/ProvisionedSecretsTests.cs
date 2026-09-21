using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.ProvisionedSecrets;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

// The type under test shares its name with the last segment of its namespace, so a test namespace mirroring the
// folder would hide it: C# finds the sibling namespace before the imported type.
namespace Altinn.App.Core.Tests.Internal;

public sealed class ProvisionedSecretsTests
{
    private const string _maskinportenFileName = "maskinporten-settings.json";
    private const string _appCodesFileName = "app-codes.json";

    private static readonly ProvisionedSecretFile _maskinporten = ProvisionedSecretFiles.Maskinporten;
    private static readonly ProvisionedSecretFile _appCodes = ProvisionedSecretFiles.AppCodes;

    [Fact]
    public void GetExistingProviderRoot_ReturnsPath_WhenDirectoryExists()
    {
        using var tempDirectory = new TempDirectory();

        Assert.Equal(tempDirectory.Path, ProvisionedSecrets.GetExistingProviderRoot(tempDirectory.Path));
    }

    [Fact]
    public void GetExistingProviderRoot_ReturnsNearestExistingParent_WhenDirectoryDoesNotExist()
    {
        using var tempDirectory = new TempDirectory();
        string missingDirectory = Path.Join(tempDirectory.Path, "missing", "app-secrets");

        Assert.Equal(tempDirectory.Path, ProvisionedSecrets.GetExistingProviderRoot(missingDirectory));
    }

    /// <summary>
    /// A consumer passes the descriptor the libraries declare — which carries no file name at all — and the
    /// channel answers with the one it resolved.
    /// </summary>
    [Fact]
    public void PathOf_IsTheFileInTheProvisionedDirectory()
    {
        using var tempDirectory = new TempDirectory();

        using var secrets = CreateChannel(tempDirectory.Path);

        Assert.Equal(
            Path.GetFullPath(Path.Join(tempDirectory.Path, _maskinportenFileName)),
            Path.GetFullPath(secrets.PathOf(_maskinporten))
        );
    }

    [Fact]
    public void PathOf_Throws_WhenTheFileIsNotHostedHere()
    {
        using var tempDirectory = new TempDirectory();

        using var secrets = CreateChannel(tempDirectory.Path);

        var exception = Assert.Throws<ArgumentException>(() =>
            secrets.PathOf(new ProvisionedSecretFile("RUNTIME_APP_SOMETHING_ELSE_FILENAME", "SomethingElse"))
        );

        Assert.Contains("RUNTIME_APP_SOMETHING_ELSE_FILENAME", exception.Message, StringComparison.Ordinal);
    }

    /// <summary>
    /// The channel holds resolved files only: the variables are read when it is built, and never again.
    /// </summary>
    [Fact]
    public void Files_AreEveryHostedFile_Resolved()
    {
        using var tempDirectory = new TempDirectory();

        using var secrets = CreateChannel(tempDirectory.Path);

        Assert.Equal(
            ProvisionedSecretFiles.All.Select(file => file.FileNameKey),
            secrets.Files.Select(file => file.FileNameKey)
        );
        Assert.All(secrets.Files, file => Assert.True(file.IsResolved));
    }

    /// <summary>
    /// The file is whatever the platform called it, and nothing in the libraries knows that name in advance.
    /// </summary>
    [Fact]
    public async Task Section_ReadsTheFileUnderTheNameThePlatformGaveIt()
    {
        using var tempDirectory = new TempDirectory();
        await File.WriteAllTextAsync(
            Path.Join(tempDirectory.Path, "credentials-of-some-other-name.json"),
            CreateSettingsJson("named-by-the-platform")
        );

        using var secrets = CreateChannel(tempDirectory.Path, "credentials-of-some-other-name.json");

        Assert.Equal("named-by-the-platform", secrets.Section(_maskinporten)["clientId"]);
    }

    [Fact]
    public void Section_IsEmpty_WhenTheFileDoesNotExist()
    {
        using var tempDirectory = new TempDirectory();

        using var secrets = CreateChannel(tempDirectory.Path);

        Assert.Empty(secrets.Section(_maskinporten).AsEnumerable(makePathsRelative: true));
    }

    [Fact]
    public void Section_IsEmpty_WhenTheDirectoryDoesNotExist()
    {
        // The secrets volume is mounted by the platform, so the directory can be missing at startup.
        using var tempDirectory = new TempDirectory();

        using var secrets = CreateChannel(Path.Join(tempDirectory.Path, "missing"));

        Assert.Empty(secrets.Section(_maskinporten).AsEnumerable(makePathsRelative: true));
    }

    [Fact]
    public async Task Section_ReadsTheProvisionedFile()
    {
        using var tempDirectory = new TempDirectory();
        await File.WriteAllTextAsync(
            Path.Join(tempDirectory.Path, _maskinportenFileName),
            CreateSettingsJson("provisioned-client")
        );

        using var secrets = CreateChannel(tempDirectory.Path);

        Assert.Equal("provisioned-client", secrets.Section(_maskinporten)["clientId"]);
    }

    [Fact]
    public async Task Section_ReadsAFileProvisionedAfterTheChannelWasBuilt()
    {
        // Every file is optional and the provider polls, so one the platform writes after the app started is
        // picked up without a restart.
        using var tempDirectory = new TempDirectory();

        using var secrets = CreateChannel(tempDirectory.Path);
        Assert.Null(secrets.Section(_maskinporten)["clientId"]);

        await File.WriteAllTextAsync(
            Path.Join(tempDirectory.Path, _maskinportenFileName),
            CreateSettingsJson("client-after")
        );

        await Wait.Until(() => secrets.Section(_maskinporten)["clientId"] == "client-after", TimeSpan.FromSeconds(30));
    }

    [LinuxOnlyFact]
    public async Task Section_Reloads_WhenTheKubernetesDataSymlinkChanges()
    {
        using var tempDirectory = new TempDirectory();
        var projectedVolume = new KubernetesProjectedVolume(tempDirectory.Path);
        projectedVolume.WriteVersion(
            KubernetesProjectedVolume.InitialVersionDirectoryName,
            _maskinportenFileName,
            CreateSettingsJson("client-before"),
            KubernetesProjectedVolume.InitialVersionLastWriteTimeUtc
        );
        projectedVolume.CreateSymlinks(KubernetesProjectedVolume.InitialVersionDirectoryName, _maskinportenFileName);

        using var secrets = CreateChannel(tempDirectory.Path);
        Assert.Equal("client-before", secrets.Section(_maskinporten)["clientId"]);

        projectedVolume.WriteVersion(
            KubernetesProjectedVolume.UpdatedVersionDirectoryName,
            _maskinportenFileName,
            CreateSettingsJson("client-after"),
            KubernetesProjectedVolume.UpdatedVersionLastWriteTimeUtc
        );
        projectedVolume.SwapDataSymlink(KubernetesProjectedVolume.UpdatedVersionDirectoryName);

        await Wait.Until(() => secrets.Section(_maskinporten)["clientId"] == "client-after", TimeSpan.FromSeconds(30));
    }

    /// <summary>
    /// The platform says where the secrets are and what every hosted file is called, and the channel is built
    /// from exactly that. Nothing here is a library default.
    /// </summary>
    [Fact]
    public void FromConfiguration_BuildsTheChannelThePlatformDescribed()
    {
        using var tempDirectory = new TempDirectory();

        using ProvisionedSecrets secrets = ProvisionedSecrets.FromConfiguration(
            ConfigurationWith(
                (ProvisionedSecrets.DirectoryKey, tempDirectory.Path),
                (_maskinporten.FileNameKey, "credentials.json"),
                (_appCodes.FileNameKey, "codes.json")
            )
        );

        Assert.Equal(Path.GetFullPath(tempDirectory.Path), Path.GetFullPath(secrets.Directory));
        Assert.Equal(
            Path.GetFullPath(Path.Join(tempDirectory.Path, "credentials.json")),
            Path.GetFullPath(secrets.PathOf(_maskinporten))
        );
        Assert.Equal(
            Path.GetFullPath(Path.Join(tempDirectory.Path, "codes.json")),
            Path.GetFullPath(secrets.PathOf(_appCodes))
        );
    }

    /// <summary>
    /// There is no location to fall back to that would not be a guess, so a variable nobody set is a startup
    /// failure that names it — in every environment, including the one a developer is in.
    /// </summary>
    [Theory]
    [InlineData(ProvisionedSecrets.DirectoryKey)]
    [InlineData("RUNTIME_APP_SECRETS_MASKINPORTEN_FILENAME")]
    [InlineData("RUNTIME_APP_SECRETS_APPCODES_FILENAME")]
    public void FromConfiguration_Throws_WhenAVariableIsNotSet(string missingKey)
    {
        using var tempDirectory = new TempDirectory();
        Dictionary<string, string?> values = new()
        {
            [ProvisionedSecrets.DirectoryKey] = tempDirectory.Path,
            [_maskinporten.FileNameKey] = _maskinportenFileName,
            [_appCodes.FileNameKey] = _appCodesFileName,
        };
        values.Remove(missingKey);

        var exception = Assert.Throws<ApplicationConfigException>(() =>
            ProvisionedSecrets.FromConfiguration(new ConfigurationBuilder().AddInMemoryCollection(values).Build())
        );

        Assert.Contains(missingKey, exception.Message, StringComparison.Ordinal);
        Assert.Contains("studioctl app run", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void FromConfiguration_Throws_WhenAVariableIsBlank()
    {
        using var tempDirectory = new TempDirectory();

        var exception = Assert.Throws<ApplicationConfigException>(() =>
            ProvisionedSecrets.FromConfiguration(
                ConfigurationWith(
                    (ProvisionedSecrets.DirectoryKey, tempDirectory.Path),
                    (_maskinporten.FileNameKey, "  "),
                    (_appCodes.FileNameKey, _appCodesFileName)
                )
            )
        );

        Assert.Contains(_maskinporten.FileNameKey, exception.Message, StringComparison.Ordinal);
    }

    /// <summary>
    /// A file name is a name, not a path: a value that walked out of the secrets directory would reopen the
    /// hole this channel exists to close.
    /// </summary>
    [Theory]
    [InlineData("../elsewhere/credentials.json")]
    [InlineData("nested/credentials.json")]
    [InlineData("nested\\credentials.json")]
    [InlineData("/absolute/credentials.json")]
    [InlineData(".")]
    [InlineData("..")]
    public void FromConfiguration_Throws_WhenAFileNameIsAPath(string fileName)
    {
        using var tempDirectory = new TempDirectory();

        var exception = Assert.Throws<ApplicationConfigException>(() =>
            ProvisionedSecrets.FromConfiguration(
                ConfigurationWith(
                    (ProvisionedSecrets.DirectoryKey, tempDirectory.Path),
                    (_maskinporten.FileNameKey, fileName),
                    (_appCodes.FileNameKey, _appCodesFileName)
                )
            )
        );

        Assert.Contains(_maskinporten.FileNameKey, exception.Message, StringComparison.Ordinal);
        Assert.Contains(fileName, exception.Message, StringComparison.Ordinal);
    }

    /// <summary>
    /// The descriptor a consumer holds carries what the libraries configured; resolution adds what the
    /// platform answered, on a copy. The descriptor itself is left alone, so the two can never be confused.
    /// </summary>
    [Fact]
    public void Resolve_ReturnsACopyCarryingTheNameThePlatformGaveIt()
    {
        ProvisionedSecretFile resolved = _maskinporten.Resolve(
            ConfigurationWith((_maskinporten.FileNameKey, _maskinportenFileName))
        );

        Assert.Equal(_maskinportenFileName, resolved.FileName);
        Assert.True(resolved.IsResolved);
        Assert.Equal(_maskinporten.FileNameKey, resolved.FileNameKey);
        Assert.Equal(_maskinporten.SectionName, resolved.SectionName);

        Assert.Null(_maskinporten.FileName);
        Assert.False(_maskinporten.IsResolved);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("  ")]
    public void Resolve_Throws_WhenTheVariableIsNotSet(string? fileName)
    {
        var exception = Assert.Throws<ApplicationConfigException>(() =>
            _maskinporten.Resolve(ConfigurationWith((_maskinporten.FileNameKey, fileName)))
        );

        Assert.Contains(_maskinporten.FileNameKey, exception.Message, StringComparison.Ordinal);
        Assert.Contains("studioctl app run", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Resolve_Throws_WhenTheNameIsAPath()
    {
        var exception = Assert.Throws<ApplicationConfigException>(() =>
            _maskinporten.Resolve(ConfigurationWith((_maskinporten.FileNameKey, "nested/credentials.json")))
        );

        Assert.Contains(_maskinporten.FileNameKey, exception.Message, StringComparison.Ordinal);
        Assert.Contains("must name a file inside the directory", exception.Message, StringComparison.Ordinal);
    }

    /// <summary>
    /// The non-throwing sibling, for the sweep of the secrets directory: it excludes the hosted files by name,
    /// and a name the platform never set excludes nothing rather than failing the sweep.
    /// </summary>
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("  ")]
    [InlineData("nested/credentials.json")]
    [InlineData("nested\\credentials.json")]
    [InlineData("/absolute/credentials.json")]
    [InlineData(".")]
    [InlineData("..")]
    public void TryResolve_IsFalse_WhenThereIsNoUsableName(string? fileName)
    {
        bool resolvedName = _maskinporten.TryResolve(
            ConfigurationWith((_maskinporten.FileNameKey, fileName)),
            out ProvisionedSecretFile? resolved
        );

        Assert.False(resolvedName);
        Assert.Null(resolved);
    }

    [Fact]
    public void TryResolve_IsTrue_WhenThePlatformNamedTheFile()
    {
        bool resolvedName = _maskinporten.TryResolve(
            ConfigurationWith((_maskinporten.FileNameKey, _maskinportenFileName)),
            out ProvisionedSecretFile? resolved
        );

        Assert.True(resolvedName);
        Assert.Equal(_maskinportenFileName, resolved?.FileName);
    }

    /// <summary>
    /// The channel is opened at host startup rather than the first time a tenant wants a secret, so an
    /// environment that never said where the secrets are fails to start instead of failing one request hours
    /// later.
    /// </summary>
    [Fact]
    public async Task Host_DoesNotStart_WhenTheVariablesAreNotSet()
    {
        using IHost host = BuildChannelHost();

        var exception = await Assert.ThrowsAsync<ApplicationConfigException>(() => host.StartAsync());

        Assert.Contains(ProvisionedSecrets.DirectoryKey, exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Host_Starts_WhenTheVariablesAreSet()
    {
        using var tempDirectory = new TempDirectory();
        using IHost host = BuildChannelHost(
            (ProvisionedSecrets.DirectoryKey, tempDirectory.Path),
            (_maskinporten.FileNameKey, _maskinportenFileName),
            (_appCodes.FileNameKey, _appCodesFileName)
        );

        await host.StartAsync();
        await host.StopAsync();

        var secrets = host.Services.GetRequiredService<ProvisionedSecrets>();
        Assert.Equal(Path.GetFullPath(tempDirectory.Path), Path.GetFullPath(secrets.Directory));
    }

    /// <summary>
    /// A host with nothing in it but the channel, so that what fails startup is the channel alone.
    /// </summary>
    private static IHost BuildChannelHost(params (string Key, string? Value)[] appConfiguration)
    {
        HostApplicationBuilder builder = Host.CreateEmptyApplicationBuilder(new HostApplicationBuilderSettings());
        builder.Configuration.AddInMemoryCollection(
            appConfiguration.Select(value => new KeyValuePair<string, string?>(value.Key, value.Value))
        );
        builder.Services.AddLogging();
        builder.Services.AddProvisionedSecrets();

        return builder.Build();
    }

    /// <summary>
    /// The channel the platform described, with the Maskinporten file provisioned under
    /// <paramref name="maskinportenFileName"/>.
    /// </summary>
    private static ProvisionedSecrets CreateChannel(
        string secretsDirectory,
        string maskinportenFileName = _maskinportenFileName
    ) =>
        ProvisionedSecrets.FromConfiguration(
            ConfigurationWith(
                (ProvisionedSecrets.DirectoryKey, secretsDirectory),
                (_maskinporten.FileNameKey, maskinportenFileName),
                (_appCodes.FileNameKey, _appCodesFileName)
            )
        );

    private static IConfigurationRoot ConfigurationWith(params (string Key, string? Value)[] values) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(values.Select(value => new KeyValuePair<string, string?>(value.Key, value.Value)))
            .Build();

    private static string CreateSettingsJson(string clientId) =>
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
