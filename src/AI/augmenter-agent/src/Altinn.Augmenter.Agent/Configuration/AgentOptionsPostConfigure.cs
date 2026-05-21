using Microsoft.Extensions.Options;

namespace Altinn.Augmenter.Agent.Configuration;

/// <summary>
/// Copies the API key from a configurable IConfiguration path
/// (<see cref="AgentOptions.ApiKeySource"/>) into <see cref="AgentOptions.ApiKey"/>
/// when the direct slot is empty. Lets a tenant point at any Key Vault secret
/// name (e.g. one that embeds the tenant/app id) without baking that name into
/// the image. Runs after Configure&lt;AgentOptions&gt; binding so direct
/// <c>Agent:ApiKey</c> values from env or .env still win.
/// </summary>
public sealed class AgentOptionsPostConfigure : IPostConfigureOptions<AgentOptions>
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<AgentOptionsPostConfigure> _logger;

    public AgentOptionsPostConfigure(
        IConfiguration configuration,
        ILogger<AgentOptionsPostConfigure> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public void PostConfigure(string? name, AgentOptions options)
    {
        if (!string.IsNullOrEmpty(options.ApiKey))
            return;

        if (string.IsNullOrEmpty(options.ApiKeySource))
            return;

        var value = _configuration[options.ApiKeySource];
        if (string.IsNullOrEmpty(value))
        {
            _logger.LogWarning(
                "Agent:ApiKeySource is set to {Path} but no value found there. " +
                "Agent:ApiKey remains empty — gateway calls will fail.",
                options.ApiKeySource);
            return;
        }

        options.ApiKey = value;
        _logger.LogInformation(
            "Agent:ApiKey populated from configuration path {Path}.",
            options.ApiKeySource);
    }
}
