using Altinn.Augmenter.Agent.Configuration;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace Altinn.Augmenter.Agent.Tests.Unit.Configuration;

public class AgentOptionsPostConfigureTests
{
    [Fact]
    public void PostConfigure_DirectApiKey_TakesPrecedenceOverSource()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ttd:app:test-app:sandkasse-api-key"] = "from-keyvault",
            })
            .Build();

        var postConfigure = new AgentOptionsPostConfigure(
            config, NullLogger<AgentOptionsPostConfigure>.Instance);

        var options = new AgentOptions
        {
            ApiKey = "from-env",
            ApiKeySource = "ttd:app:test-app:sandkasse-api-key",
        };

        postConfigure.PostConfigure(null, options);

        options.ApiKey.Should().Be("from-env");
    }

    [Fact]
    public void PostConfigure_SourcePath_PopulatesEmptyApiKey()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ttd:app:test-app:sandkasse-api-key"] = "from-keyvault",
            })
            .Build();

        var postConfigure = new AgentOptionsPostConfigure(
            config, NullLogger<AgentOptionsPostConfigure>.Instance);

        var options = new AgentOptions
        {
            ApiKey = null,
            ApiKeySource = "ttd:app:test-app:sandkasse-api-key",
        };

        postConfigure.PostConfigure(null, options);

        options.ApiKey.Should().Be("from-keyvault");
    }

    [Fact]
    public void PostConfigure_MissingSource_LeavesApiKeyEmpty()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ttd:app:test-app:sandkasse-api-key"] = "from-keyvault",
            })
            .Build();

        var postConfigure = new AgentOptionsPostConfigure(
            config, NullLogger<AgentOptionsPostConfigure>.Instance);

        var options = new AgentOptions
        {
            ApiKey = null,
            ApiKeySource = null,
        };

        postConfigure.PostConfigure(null, options);

        options.ApiKey.Should().BeNull();
    }

    [Fact]
    public void PostConfigure_SourceSetButNoValue_LeavesApiKeyEmpty()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>())
            .Build();

        var postConfigure = new AgentOptionsPostConfigure(
            config, NullLogger<AgentOptionsPostConfigure>.Instance);

        var options = new AgentOptions
        {
            ApiKey = null,
            ApiKeySource = "ttd:app:nonexistent:key",
        };

        postConfigure.PostConfigure(null, options);

        options.ApiKey.Should().BeNull();
    }
}
