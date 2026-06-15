using System.Text.Encodings.Web;
using Altinn.App.Api.Infrastructure.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Microsoft.AspNetCore.Authentication;
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
            WorkflowEngineCallbackAuthenticationHandler.SchemeName,
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

    [Theory]
    [InlineData("/tdd/app/instances/500600/3a1b/workflow-engine-callbacks/some-command", true)]
    [InlineData("/tdd/app/instances/500600/3a1b/WORKFLOW-ENGINE-CALLBACKS/some-command", true)]
    [InlineData("/tdd/app/instances/500600/3a1b/process/next", false)]
    [InlineData("/", false)]
    // Tightened from a bare substring match: the segment must sit in the real callback route shape, so an
    // unrelated app path containing it is not forced onto the callback scheme (and does not lose JwtCookie).
    [InlineData("/tdd/workflow-engine-callbacks/some-command", false)] // No /instances/{party}/{guid}/ prefix.
    [InlineData("/tdd/app/instances/not-a-number/3a1b/workflow-engine-callbacks/cmd", false)] // Party id not numeric.
    [InlineData("/tdd/app/instances/500600/3a1b/workflow-engine-callbacks/", false)] // No command segment.
    public void IsCallbackRequest_MatchesOnlyCallbackPaths(string path, bool expected)
    {
        Assert.Equal(expected, WorkflowEngineCallbackAuthenticationHandler.IsCallbackRequest(path));
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
