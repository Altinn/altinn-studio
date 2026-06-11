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

    private async Task<(AuthenticateResult Result, HttpContext Context)> Authenticate(
        string? tokenHeader,
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
        if (tokenHeader is not null)
            context.Request.Headers[WorkflowEngineCallbackAuthenticationHandler.TokenHeaderName] = tokenHeader;
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
        var (result, _) = await Authenticate(tokenHeader: null, instanceGuidRouteValue: Guid.NewGuid());

        Assert.False(result.Succeeded);
        Assert.True(result.None);
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
