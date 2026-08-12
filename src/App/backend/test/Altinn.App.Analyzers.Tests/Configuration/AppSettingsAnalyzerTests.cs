using Altinn.App.Analyzers.Configuration;
using Altinn.App.Analyzers.Tests.Fixtures;
using Microsoft.CodeAnalysis.Diagnostics;
using Xunit.Abstractions;

namespace Altinn.App.Analyzers.Tests.Configuration;

[Collection(nameof(AltinnTestAppCollection))]
public class AppSettingsAnalyzerTests : IAsyncLifetime
{
    private const string CollidingJson = """
        {
          "MaskinportenSettings": {
            "clientId": "e23f-..."
          }
        }
        """;

    private readonly AltinnTestAppFixture _fixture;

    public AppSettingsAnalyzerTests(AltinnTestAppFixture fixture, ITestOutputHelper output)
    {
        fixture.SetTestOutputHelper(output);
        _fixture = fixture;
    }

    public async Task InitializeAsync() => await _fixture.Initialize();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task Emits_For_An_AppSettings_AdditionalFile()
    {
        using var cts = new CancellationTokenSource(TimeSpan.FromMinutes(1));
        var cancellationToken = cts.Token;

        var analyzer = new AppSettingsAnalyzer();
        var options = AltinnAppAnalyzerOptions.Create(
            new InMemoryAdditionalText("/repo/App/appsettings.json", CollidingJson),
            new InMemoryAdditionalText("/repo/App/appsettings.Staging.json", CollidingJson)
        );

        var (compilation, diagnostics) = await _fixture.GetCompilation(analyzer, cancellationToken, options);

        Assert.Equal(2, diagnostics.Count);
        Assert.All(diagnostics, d => Assert.Equal(Diagnostics.Configuration.MaskinportenCredentialsCollision.Id, d.Id));
        await Verify(diagnostics);
    }

    [Fact]
    public async Task Ignores_AdditionalFiles_That_Are_Not_AppSettings()
    {
        using var cts = new CancellationTokenSource(TimeSpan.FromMinutes(1));
        var cancellationToken = cts.Token;

        var analyzer = new AppSettingsAnalyzer();
        var options = AltinnAppAnalyzerOptions.Create(
            new InMemoryAdditionalText("/repo/App/config/applicationmetadata.json", CollidingJson)
        );

        var (compilation, diagnostics) = await _fixture.GetCompilation(analyzer, cancellationToken, options);

        Assert.Empty(diagnostics);
    }

    [Fact]
    public async Task Emits_Nothing_Outside_An_App_Project()
    {
        // Without the IsAltinnApp property (a unit-test project pulling the analyzer in transitively),
        // the analyzer must stay silent even when a colliding appsettings file is present.
        using var cts = new CancellationTokenSource(TimeSpan.FromMinutes(1));
        var cancellationToken = cts.Token;

        var analyzer = new AppSettingsAnalyzer();
        var options = new AnalyzerOptions([new InMemoryAdditionalText("/repo/App/appsettings.json", CollidingJson)]);

        var (compilation, diagnostics) = await _fixture.GetCompilation(analyzer, cancellationToken, options);

        Assert.Empty(diagnostics);
    }
}
