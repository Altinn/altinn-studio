using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using WorkflowEngine.Models;

namespace WorkflowEngine.Api.Authentication.ApiKey;

internal class ApiKeyAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string SchemeName = "ApiKeyScheme";
    public const string PolicyName = "ApiKeyPolicy";
    public const string HeaderName = "X-Api-Key";

    private readonly IServiceProvider _serviceProvider;
    private ApiSettings _settings => _serviceProvider.GetRequiredService<IOptions<ApiSettings>>().Value;

    public ApiKeyAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        IServiceProvider serviceProvider
    )
        : base(options, logger, encoder)
    {
        _serviceProvider = serviceProvider;
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(HeaderName, out var apiKeyHeader))
            return Task.FromResult(AuthenticateResult.NoResult());

        if (!_settings.ApiKeys.Contains(apiKeyHeader[0]))
            return Task.FromResult(AuthenticateResult.Fail($"Invalid API key: {apiKeyHeader[0]}"));

        var claims = new[] { new Claim(ClaimTypes.Name, "ApiKeyUser") };
        var identity = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }

    protected override Task HandleChallengeAsync(AuthenticationProperties properties)
    {
        Response.StatusCode = Request.Headers.ContainsKey(HeaderName)
            ? StatusCodes.Status403Forbidden
            : StatusCodes.Status401Unauthorized;

        return Task.CompletedTask;
    }
}
