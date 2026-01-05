using System.Security.Claims;
using System.Text.Encodings.Web;
using Altinn.App.ProcessEngine.Constants;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using WorkflowEngine.Models;

namespace Altinn.App.ProcessEngine.Controllers.Auth;

internal class ApiKeyAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ProcessEngineSettings _settings;
    private const string SchemeName = AuthConstants.ApiKeySchemeName;
    private const string HeaderName = AuthConstants.ApiKeyHeaderName;

    public ApiKeyAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        IServiceProvider serviceProvider
    )
        : base(options, logger, encoder)
    {
        _serviceProvider = serviceProvider;
        _settings = _serviceProvider.GetRequiredService<IOptions<ProcessEngineSettings>>().Value;
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(HeaderName, out var apiKeyHeader))
            return Task.FromResult(AuthenticateResult.Fail("Missing API Key"));

        if (apiKeyHeader.First() != _settings.ApiKey)
            return Task.FromResult(AuthenticateResult.Fail("Invalid API Key"));

        var claims = new[] { new Claim(ClaimTypes.Name, "ApiKeyUser") };
        var identity = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
