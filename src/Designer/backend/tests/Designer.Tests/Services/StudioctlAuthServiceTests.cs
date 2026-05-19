using System;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace Designer.Tests.Services;

public class StudioctlAuthServiceTests
{
    [Fact]
    public async Task Authorize_WithCanonicalAuthenticatedUsername_RedirectsToCanonicalSettingsOwner()
    {
        StudioctlAuthService service = CreateService();
        var controller = new StudioctlAuthController(service)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.Name, "Jondyr")], "test")),
                },
            },
        };

        IActionResult result = await controller.Authorize(
            "http://127.0.0.1:12345/callback",
            "state",
            "code-challenge",
            "studioctl prod",
            CancellationToken.None
        );

        var redirect = Assert.IsType<RedirectResult>(result);
        Assert.StartsWith("/settings/Jondyr/studioctl-auth?requestId=", redirect.Url);
    }

    [Fact]
    public async Task CreateAuthorizationRequestAsync_WithCanonicalUsername_PreservesCasingInConfirmationUrl()
    {
        StudioctlAuthService service = CreateService();
        var request = new StudioctlAuthorizeRequest(
            "http://127.0.0.1:12345/callback",
            "state",
            "code-challenge",
            "studioctl prod"
        );

        StudioctlAuthResult<string> result = await service.CreateAuthorizationRequestAsync(
            "Jondyr",
            request,
            CancellationToken.None
        );

        Assert.Equal(StudioctlAuthStatus.Success, result.Status);
        Assert.StartsWith("/settings/Jondyr/studioctl-auth?requestId=", result.Value);
    }

    [Fact]
    public async Task CreateAuthorizationRequestAsync_WithLowercaseExistingUsername_PreservesCasingInConfirmationUrl()
    {
        StudioctlAuthService service = CreateService();
        var request = new StudioctlAuthorizeRequest(
            "http://127.0.0.1:12345/callback",
            "state",
            "code-challenge",
            "studioctl prod"
        );

        StudioctlAuthResult<string> result = await service.CreateAuthorizationRequestAsync(
            "jondyr",
            request,
            CancellationToken.None
        );

        Assert.Equal(StudioctlAuthStatus.Success, result.Status);
        Assert.StartsWith("/settings/jondyr/studioctl-auth?requestId=", result.Value);
    }

    private static StudioctlAuthService CreateService()
    {
        var cache = new MemoryDistributedCache(Options.Create(new MemoryDistributedCacheOptions()));
        var apiKeyService = new Mock<IApiKeyService>();
        return new StudioctlAuthService(apiKeyService.Object, cache, TimeProvider.System);
    }
}
