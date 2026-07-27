using System.Text.Encodings.Web;
using Altinn.App.Api.Infrastructure.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Api.Tests.Infrastructure.Authentication;

public class WorkflowEngineCallbackAuthenticationHandlerTests
{
    private readonly Mock<IWorkflowCallbackTokenValidator> _validatorMock = new(MockBehavior.Strict);

    private Task<(AuthenticateResult Result, HttpContext Context)> Authenticate(
        string? token,
        object? instanceGuidRouteValue
    ) => AuthenticateWithHeader(token is null ? null : $"Bearer {token}", instanceGuidRouteValue);

    private async Task<(AuthenticateResult Result, HttpContext Context)> AuthenticateWithHeader(
        string? authorizationHeader,
        object? instanceGuidRouteValue
    )
    {
        var optionsMonitor = new Mock<IOptionsMonitor<AuthenticationSchemeOptions>>();
        optionsMonitor.Setup(x => x.Get(It.IsAny<string>())).Returns(new AuthenticationSchemeOptions());

        var handler = new WorkflowEngineCallbackAuthenticationHandler(
            optionsMonitor.Object,
            NullLoggerFactory.Instance,
            UrlEncoder.Default,
            _validatorMock.Object
        );

        var context = new DefaultHttpContext();
        if (authorizationHeader is not null)
            context.Request.Headers.Authorization = authorizationHeader;
        if (instanceGuidRouteValue is not null)
            context.Request.RouteValues["instanceGuid"] = instanceGuidRouteValue;

        var scheme = new AuthenticationScheme(
            WorkflowEngineCallbackDefaults.AuthenticationScheme,
            null,
            typeof(WorkflowEngineCallbackAuthenticationHandler)
        );
        await handler.InitializeAsync(scheme, context);
        return (await handler.AuthenticateAsync(), context);
    }

    [Fact]
    public async Task NoAuthorizationHeader_ReturnsNoResult()
    {
        var (result, _) = await Authenticate(token: null, instanceGuidRouteValue: Guid.NewGuid());

        Assert.False(result.Succeeded);
        Assert.True(result.None);
    }

    [Theory]
    [InlineData("some-token")] // No "Bearer " prefix.
    [InlineData("Bearer ")] // Bearer prefix but empty token.
    [InlineData("Bearer    ")] // Bearer prefix but whitespace token.
    public async Task NonBearerOrEmptyAuthorizationHeader_ReturnsNoResult(string authorizationHeader)
    {
        var (result, _) = await AuthenticateWithHeader(authorizationHeader, instanceGuidRouteValue: Guid.NewGuid());

        Assert.False(result.Succeeded);
        Assert.True(result.None);
    }

    private static Endpoint EndpointWith(params object[] metadata) =>
        new(static _ => Task.CompletedTask, new EndpointMetadataCollection(metadata), displayName: null);

    [Theory]
    // The endpoint's own [Authorize(AuthenticationSchemes = ...)] declaration is what routes it to the
    // callback scheme — matching on metadata, not the request path, so the selector can't drift from the
    // controller and unrelated paths can't be misrouted.
    [InlineData(WorkflowEngineCallbackDefaults.AuthenticationScheme, true)]
    [InlineData("Foo," + WorkflowEngineCallbackDefaults.AuthenticationScheme, true)] // among a list
    [InlineData(WorkflowEngineCallbackDefaults.AuthenticationScheme + " , Foo", true)] // whitespace trimmed
    [InlineData("JwtCookie", false)] // a different scheme
    [InlineData(null, false)] // [Authorize] with no scheme declared
    public void IsCallbackRequest_MatchesEndpointDeclaringCallbackScheme(string? schemes, bool expected)
    {
        var endpoint = EndpointWith(new AuthorizeAttribute { AuthenticationSchemes = schemes });

        Assert.Equal(expected, WorkflowEngineCallbackAuthenticationHandler.IsCallbackRequest(endpoint));
    }

    [Fact]
    public void IsCallbackRequest_NullOrUnauthorizedEndpoint_ReturnsFalse()
    {
        // No matched endpoint (e.g. a 404 path), and a matched endpoint with no authorization metadata, both
        // fall through to the default JwtCookie scheme.
        Assert.False(WorkflowEngineCallbackAuthenticationHandler.IsCallbackRequest(endpoint: null));
        Assert.False(WorkflowEngineCallbackAuthenticationHandler.IsCallbackRequest(EndpointWith()));
    }

    [Fact]
    public async Task MissingInstanceGuidRouteValue_Fails()
    {
        var (result, _) = await Authenticate("some-token", instanceGuidRouteValue: null);

        Assert.False(result.Succeeded);
        Assert.NotNull(result.Failure);
    }

    [Fact]
    public async Task ValidToken_Succeeds()
    {
        var instanceGuid = Guid.NewGuid();
        _validatorMock.Setup(x => x.ValidateToken("good-token", instanceGuid)).ReturnsAsync(true);

        var (result, _) = await Authenticate("good-token", instanceGuid);

        Assert.True(result.Succeeded);
        Assert.Equal(
            instanceGuid.ToString(),
            result.Principal!.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value
        );
    }

    [Fact]
    public async Task InvalidToken_Fails()
    {
        var instanceGuid = Guid.NewGuid();
        _validatorMock.Setup(x => x.ValidateToken("bad-token", instanceGuid)).ReturnsAsync(false);

        var (result, _) = await Authenticate("bad-token", instanceGuid);

        Assert.False(result.Succeeded);
        Assert.NotNull(result.Failure);
    }
}
