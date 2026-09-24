using System.Text;
using Altinn.App.Core.Internal.App;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Moq;

namespace Altinn.App.Core.Tests.Internal.App;

public sealed class AppFilesDITests : IDisposable
{
    private readonly DirectoryInfo _appDir = Directory.CreateTempSubdirectory("AppFilesDI-");

    public void Dispose() => _appDir.Delete(recursive: true);

    private IHostEnvironment Environment(string name)
    {
        var env = new Mock<IHostEnvironment>();
        env.SetupGet(e => e.EnvironmentName).Returns(name);
        env.SetupGet(e => e.ContentRootPath).Returns(_appDir.FullName);
        return env.Object;
    }

    private void WriteFile(string relativePath, string content)
    {
        string path = Path.Join(_appDir.FullName, relativePath);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        File.WriteAllText(path, content, new UTF8Encoding(encoderShouldEmitUTF8Identifier: false));
    }

    [Theory]
    [InlineData("Production", false)]
    [InlineData("Development", true)]
    public async Task AddAppFiles_registers_the_loaded_files_and_polls_only_in_development(
        string environment,
        bool expectPoller
    )
    {
        WriteFile("config/applicationmetadata.json", """{ "id": "ttd/app" }""");
        var services = new ServiceCollection();
        services.AddLogging();

        await services.AddAppFiles(Environment(environment));

        await using var provider = services.BuildServiceProvider();
        var accessor = provider.GetRequiredService<AppFilesAccessor>();
        Assert.Equal("""{ "id": "ttd/app" }""", Encoding.UTF8.GetString(accessor.Current.ApplicationMetadata.Span));
        Assert.Equal(expectPoller, provider.GetServices<IHostedService>().Any(s => s is AppFilesPoller));
    }

    [Fact]
    public async Task AddAppFiles_fails_when_the_application_metadata_file_is_missing()
    {
        WriteFile("ui/Settings.json", "{}");
        var services = new ServiceCollection();

        var exception = await Assert.ThrowsAsync<ApplicationConfigException>(() =>
            services.AddAppFiles(Environment("Production"))
        );

        Assert.Contains("applicationmetadata.json", exception.Message);
    }

    [Fact]
    public async Task AddAppFiles_fails_when_a_file_is_broken()
    {
        WriteFile("config/applicationmetadata.json", """{ "id": "ttd/app" }""");
        WriteFile("ui/Settings.json", "{ broken");
        var services = new ServiceCollection();

        var exception = await Assert.ThrowsAsync<ApplicationConfigException>(() =>
            services.AddAppFiles(Environment("Production"))
        );

        Assert.Contains("ui/Settings.json", exception.Message);
    }

    [Fact]
    public async Task The_accessor_and_poller_are_registered_before_the_load_completes()
    {
        WriteFile("config/applicationmetadata.json", """{ "id": "ttd/app" }""");
        var services = new ServiceCollection();
        services.AddLogging();

        // A Program.cs that forgets to await builds the container while the files may still be loading. It still
        // resolves the accessor, which explains the missing await until the files are in (see AppFiles.Empty), and
        // the poller, which would load the files on its first poll.
        var loading = services.AddAppFiles(Environment("Development"));
        await using var provider = services.BuildServiceProvider();
        var accessor = provider.GetRequiredService<AppFilesAccessor>();
        Assert.Contains(provider.GetServices<IHostedService>(), s => s is AppFilesPoller);
        await loading;

        Assert.Equal("""{ "id": "ttd/app" }""", Encoding.UTF8.GetString(accessor.Current.ApplicationMetadata.Span));
    }

    [Fact]
    public async Task AddAppFiles_refuses_a_second_call()
    {
        WriteFile("config/applicationmetadata.json", """{ "id": "ttd/app" }""");
        var services = new ServiceCollection();
        await services.AddAppFiles(Environment("Production"));

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            services.AddAppFiles(Environment("Production"))
        );

        Assert.Contains("AddAltinnAppServices", exception.Message);
    }
}
