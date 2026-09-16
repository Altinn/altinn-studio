using Altinn.App.Core.Extensions;
using Altinn.App.Core.Infrastructure.Clients.Secrets;
using Altinn.App.Core.Internal.ProvisionedSecrets;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;

// The channel's type shares its name with the last segment of its namespace, so a test namespace mirroring the
// folder would hide it: C# finds the sibling namespace before the imported type.
namespace Altinn.App.Core.Tests.Internal;

/// <summary>
/// The app's callback verification codes as a tenant of the provisioned secrets channel: what
/// <see cref="AppCodesSettings"/> bind to, and what they refuse to bind to. The registration under test is the
/// one every app gets, <c>AddPlatformServices</c>.
/// </summary>
public sealed class AppCodesProvisioningTests
{
    private static readonly ProvisionedSecretFile _file = ProvisionedSecretFiles.AppCodes;

    [Fact]
    public async Task Options_BindTheProvisionedFile()
    {
        using var tempDirectory = new TempDirectory();
        await WriteAppCodes(tempDirectory.Path, "provisioned-callback-code-long-enough");

        await using var serviceProvider = BuildAppProvider(tempDirectory.Path);

        var settings = serviceProvider.GetRequiredService<IOptions<AppCodesSettings>>().Value;
        var code = Assert.Single(settings.WorkflowEngineCallback);
        Assert.Equal("provisioned", code.Id);
        Assert.Equal("provisioned-callback-code-long-enough", code.Code);
        Assert.Equal(DateTimeOffset.Parse("2999-01-01T00:00:00Z"), code.ExpiresAt);
        // The platform omits the arrays it has issued no codes for, and an omitted array binds to none.
        Assert.Empty(settings.NotificationCallback);
        Assert.Empty(settings.PaymentsCallback);
    }

    /// <summary>
    /// The invariant this tenant creates: an <c>AppCodes</c> section in the app's own configuration is not a
    /// surface at all. The keys are spelled out because they are what an app - or an older studioctl, which
    /// passed them as <c>AppCodes__WorkflowEngineCallback__0__Code</c> environment variables - would supply.
    /// </summary>
    [Fact]
    public async Task Options_IgnoreAnAppCodesSectionInTheAppConfiguration()
    {
        using var tempDirectory = new TempDirectory();

        await using var serviceProvider = BuildAppProvider(
            tempDirectory.Path,
            ("AppCodes:WorkflowEngineCallback:0:Id", "app-supplied"),
            ("AppCodes:WorkflowEngineCallback:0:Code", "app-supplied-callback-code-long-enough"),
            ("AppCodes:WorkflowEngineCallback:0:IssuedAt", "2020-01-01T00:00:00Z"),
            ("AppCodes:WorkflowEngineCallback:0:ExpiresAt", "2999-01-01T00:00:00Z"),
            ("AppCodes:PaymentsCallback:0:Id", "app-supplied"),
            ("AppCodes:PaymentsCallback:0:Code", "app-supplied-payments-code-long-enough")
        );

        var settings = serviceProvider.GetRequiredService<IOptions<AppCodesSettings>>().Value;
        Assert.Empty(settings.WorkflowEngineCallback);
        Assert.Empty(settings.PaymentsCallback);
    }

    /// <summary>
    /// A section in the app's configuration cannot extend or displace what the platform provisioned either:
    /// the provisioned file is the only input, so there is never a section name to get right.
    /// </summary>
    [Fact]
    public async Task Options_IgnoreAnAppCodesSection_WhenCodesAreProvisioned()
    {
        using var tempDirectory = new TempDirectory();
        await WriteAppCodes(tempDirectory.Path, "provisioned-callback-code-long-enough");

        await using var serviceProvider = BuildAppProvider(
            tempDirectory.Path,
            ("AppCodes:WorkflowEngineCallback:1:Id", "app-supplied"),
            ("AppCodes:WorkflowEngineCallback:1:Code", "app-supplied-callback-code-long-enough")
        );

        var settings = serviceProvider.GetRequiredService<IOptions<AppCodesSettings>>().Value;
        var code = Assert.Single(settings.WorkflowEngineCallback);
        Assert.Equal("provisioned", code.Id);
    }

    /// <summary>
    /// Operator-driven rotation reaches a running app: the channel polls, and the change token it publishes is
    /// what <see cref="IOptionsMonitor{TOptions}"/> rebinds on.
    /// </summary>
    [Fact]
    public async Task Options_Reload_WhenTheProvisionedFileIsRotated()
    {
        using var tempDirectory = new TempDirectory();
        await WriteAppCodes(tempDirectory.Path, "callback-code-before-rotation");

        await using var serviceProvider = BuildAppProvider(tempDirectory.Path);
        var options = serviceProvider.GetRequiredService<IOptionsMonitor<AppCodesSettings>>();
        Assert.Equal("callback-code-before-rotation", options.CurrentValue.WorkflowEngineCallback[0].Code);

        await WriteAppCodes(tempDirectory.Path, "callback-code-after-rotation", DateTime.UtcNow.AddMinutes(1));

        await Wait.Until(
            () => options.CurrentValue.WorkflowEngineCallback is [{ Code: "callback-code-after-rotation" }],
            TimeSpan.FromSeconds(30)
        );
    }

    /// <summary>
    /// The app's services as an app gets them, for codes provisioned into
    /// <paramref name="secretsDirectory"/> and an app configuration of <paramref name="appConfiguration"/>.
    /// Registering the channel first is the only way to move the directory - an app has no such lever.
    /// </summary>
    private static ServiceProvider BuildAppProvider(
        string secretsDirectory,
        params (string Key, string? Value)[] appConfiguration
    )
    {
        var services = new ServiceCollection();
        services.AddSingleton(_ => new ProvisionedSecrets(secretsDirectory, ProvisionedSecretFiles.All));
        services.AddPlatformServices(
            new ConfigurationBuilder()
                .AddInMemoryCollection(
                    appConfiguration.Select(value => new KeyValuePair<string, string?>(value.Key, value.Value))
                )
                .Build(),
            Mock.Of<IWebHostEnvironment>()
        );

        // Not the strict provider: AddPlatformServices is one half of an app's registrations, and the other
        // half supplies what some of these services depend on.
        return services.BuildServiceProvider();
    }

    /// <summary>
    /// One workflow engine callback code, in the shape the platform provisions the file in.
    /// </summary>
    private static async Task WriteAppCodes(string secretsDirectory, string code, DateTime? lastWriteTimeUtc = null)
    {
        string path = Path.Join(secretsDirectory, _file.FileName);
        await File.WriteAllTextAsync(
            path,
            $$"""
            {
              "AppCodes": {
                "WorkflowEngineCallback": [
                  {
                    "Code": "{{code}}",
                    "ExpiresAt": "2999-01-01T00:00:00Z",
                    "Id": "provisioned",
                    "IssuedAt": "2020-01-01T00:00:00Z"
                  }
                ]
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
