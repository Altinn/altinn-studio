using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using WorkflowEngine.App.Commands.AppCommand;
using WorkflowEngine.App.Extensions;

namespace WorkflowEngine.App.Tests.Extensions;

/// <summary>
/// Tests for <see cref="ServiceCollectionExtensions"/> and <see cref="AppCommandOptionsBuilderExtensions"/>
/// covering config validation and default application.
/// </summary>
public class AppCommandExtensionsTests
{
    [Fact]
    public void ConfigureAppCommand_ValidSettings_Resolves()
    {
        var services = new ServiceCollection();
        services.ConfigureAppCommand(opts =>
        {
            opts.ApiKey = "my-api-key";
            opts.CommandEndpoint = "https://example.com/{Org}/{App}/callbacks";
        });

        using var sp = services.BuildServiceProvider();
        var options = sp.GetRequiredService<IOptions<AppCommandSettings>>();

        Assert.Equal("my-api-key", options.Value.ApiKey);
        Assert.Equal("https://example.com/{Org}/{App}/callbacks", options.Value.CommandEndpoint);
    }

    [Fact]
    public void ConfigureAppCommand_DefaultApiKeyHeaderName()
    {
        var services = new ServiceCollection();
        services.ConfigureAppCommand(opts =>
        {
            opts.ApiKey = "my-api-key";
            opts.CommandEndpoint = "https://example.com/{Org}/{App}/callbacks";
        });

        using var sp = services.BuildServiceProvider();
        var options = sp.GetRequiredService<IOptions<AppCommandSettings>>();

        Assert.Equal("X-Api-Key", options.Value.ApiKeyHeaderName);
    }

    [Fact]
    public void ConfigureAppCommand_EmptyApiKey_ThrowsOnResolve()
    {
        var services = new ServiceCollection();
        services.ConfigureAppCommand(opts =>
        {
            opts.ApiKey = "";
            opts.CommandEndpoint = "https://example.com/{Org}/{App}/callbacks";
        });

        using var sp = services.BuildServiceProvider();

        var ex = Assert.Throws<OptionsValidationException>(() =>
            sp.GetRequiredService<IOptions<AppCommandSettings>>().Value
        );
        Assert.Contains("ApiKey", ex.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void ConfigureAppCommand_InvalidCommandEndpoint_ThrowsOnResolve()
    {
        var services = new ServiceCollection();
        services.ConfigureAppCommand(opts =>
        {
            opts.ApiKey = "my-key";
            opts.CommandEndpoint = "not a valid url";
        });

        using var sp = services.BuildServiceProvider();

        var ex = Assert.Throws<OptionsValidationException>(() =>
            sp.GetRequiredService<IOptions<AppCommandSettings>>().Value
        );
        Assert.Contains("CommandEndpoint", ex.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void ConfigureAppCommand_NullCommandEndpoint_AppliesDefault()
    {
        var services = new ServiceCollection();
        services.ConfigureAppCommand(opts =>
        {
            opts.ApiKey = "my-key";
            opts.CommandEndpoint = null!;
        });

        using var sp = services.BuildServiceProvider();
        var options = sp.GetRequiredService<IOptions<AppCommandSettings>>();

        Assert.NotNull(options.Value.CommandEndpoint);
        Assert.Contains("process-engine-callbacks", options.Value.CommandEndpoint, StringComparison.Ordinal);
    }

    [Fact]
    public void ConfigureAppCommand_CustomApiKeyHeaderName_Preserved()
    {
        var services = new ServiceCollection();
        services.ConfigureAppCommand(opts =>
        {
            opts.ApiKey = "my-key";
            opts.CommandEndpoint = "https://example.com/callbacks";
            opts.ApiKeyHeaderName = "Authorization";
        });

        using var sp = services.BuildServiceProvider();
        var options = sp.GetRequiredService<IOptions<AppCommandSettings>>();

        Assert.Equal("Authorization", options.Value.ApiKeyHeaderName);
    }
}
