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

        services.AddAppFiles(Environment(environment));

        await using var provider = services.BuildServiceProvider();
        var accessor = provider.GetRequiredService<AppFilesAccessor>();
        Assert.Equal("""{ "id": "ttd/app" }""", Encoding.UTF8.GetString(accessor.Current.ApplicationMetadata.Span));
        Assert.Equal(expectPoller, provider.GetServices<IHostedService>().Any(s => s is AppFilesPoller));
    }

    [Fact]
    public void AddAppFiles_fails_when_the_application_metadata_file_is_missing()
    {
        WriteFile("ui/Settings.json", "{}");
        var services = new ServiceCollection();

        var exception = Assert.Throws<ApplicationConfigException>(() =>
            services.AddAppFiles(Environment("Production"))
        );

        Assert.Contains("applicationmetadata.json", exception.Message);
    }

    [Fact]
    public void AddAppFiles_fails_when_a_file_is_broken()
    {
        WriteFile("config/applicationmetadata.json", """{ "id": "ttd/app" }""");
        WriteFile("ui/Settings.json", "{ broken");
        var services = new ServiceCollection();

        var exception = Assert.Throws<ApplicationConfigException>(() =>
            services.AddAppFiles(Environment("Production"))
        );

        Assert.Contains("ui/Settings.json", exception.Message);
    }

    [Fact]
    public void AddAppFiles_refuses_a_second_call()
    {
        WriteFile("config/applicationmetadata.json", """{ "id": "ttd/app" }""");
        var services = new ServiceCollection();
        services.AddAppFiles(Environment("Production"));

        var exception = Assert.Throws<InvalidOperationException>(() => services.AddAppFiles(Environment("Production")));

        Assert.Contains("AddAltinnAppServices", exception.Message);
    }
}
