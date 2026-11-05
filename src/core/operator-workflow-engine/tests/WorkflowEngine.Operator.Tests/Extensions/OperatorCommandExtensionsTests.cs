using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using WorkflowEngine.Operator.Commands.OperatorCommand;
using WorkflowEngine.Operator.Extensions;

namespace WorkflowEngine.Operator.Tests.Extensions;

/// <summary>
/// Tests the defaults and validation of <see cref="OperatorCommandSettings"/>.
/// </summary>
public class OperatorCommandExtensionsTests
{
    [Fact]
    public void ConfigureOperatorCommand_Unset_AppliesClusterDefaults()
    {
        using var sp = BuildServiceProvider([]);
        var settings = sp.GetRequiredService<IOptions<OperatorCommandSettings>>().Value;

        Assert.Equal(
            "http://core-operator.core-operator.svc.cluster.local:8090/workflow-engine-callbacks/",
            settings.CommandEndpoint
        );
        Assert.Equal("/var/run/secrets/core-operator/token", settings.TokenPath);
    }

    [Fact]
    public void ConfigureOperatorCommand_EmptyTokenPath_KeepsItEmpty()
    {
        using var sp = BuildServiceProvider(
            new()
            {
                ["OperatorCommandSettings:CommandEndpoint"] = "http://localhost:8090/workflow-engine-callbacks/",
                ["OperatorCommandSettings:TokenPath"] = "",
            }
        );
        var settings = sp.GetRequiredService<IOptions<OperatorCommandSettings>>().Value;

        Assert.Equal("http://localhost:8090/workflow-engine-callbacks/", settings.CommandEndpoint);
        Assert.Equal("", settings.TokenPath);
    }

    [Theory]
    [InlineData("not a valid url")]
    [InlineData("/workflow-engine-callbacks/")]
    [InlineData("ftp://operator/workflow-engine-callbacks/")]
    public void ConfigureOperatorCommand_InvalidCommandEndpoint_ThrowsOnResolve(string endpoint)
    {
        using var sp = BuildServiceProvider(new() { ["OperatorCommandSettings:CommandEndpoint"] = endpoint });

        var ex = Assert.Throws<OptionsValidationException>(() =>
            sp.GetRequiredService<IOptions<OperatorCommandSettings>>().Value
        );
        Assert.Contains("CommandEndpoint", ex.Message, StringComparison.Ordinal);
    }

    private static ServiceProvider BuildServiceProvider(Dictionary<string, string?> configuration)
    {
        var services = new ServiceCollection();
        services.AddSingleton<IConfiguration>(new ConfigurationBuilder().AddInMemoryCollection(configuration).Build());
        services.ConfigureOperatorCommand();
        return services.BuildServiceProvider();
    }
}
