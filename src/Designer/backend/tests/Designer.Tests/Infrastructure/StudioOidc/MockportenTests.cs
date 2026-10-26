#nullable enable
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Infrastructure.StudioOidc;
using Altinn.Studio.Designer.Models.Dto;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace Designer.Tests.Infrastructure.StudioOidc;

public class MockportenTests
{
    [Theory]
    [InlineData("01818520030", true)]
    [InlineData("41818520024", true)]
    [InlineData("01818520031", false)]
    [InlineData("01018520030", false)]
    [InlineData("41018520024", false)]
    [InlineData("0181852003", false)]
    [InlineData("018185200300", false)]
    [InlineData("0181852003X", false)]
    [InlineData("٠١٨١٨٥٢٠٠٣٠", false)]
    [InlineData(null, false)]
    public void SyntheticPidValidation(string? pid, bool expected) => Assert.Equal(expected, SyntheticPid.IsValid(pid));

    [Fact]
    public void ConfigurationIsDisabledByDefault() => Assert.False(new MockportenSettings().Enabled);

    [Theory]
    [InlineData("admin")]
    [InlineData("mockporten-Admin")]
    [InlineData("mockporten-../admin")]
    [InlineData("mockporten-")]
    public void ConfigurationRejectsUnreservedOrUnsafeUsername(string username)
    {
        var settings = Settings();
        settings.Users[0].Username = username;
        Assert.Throws<InvalidOperationException>(settings.Validate);
    }

    [Fact]
    public void ConfigurationRejectsDuplicateIdentity()
    {
        var settings = Settings();
        settings.Users.Add(new MockportenUser { Username = "mockporten-other", PidHash = settings.Users[0].PidHash });
        Assert.Throws<InvalidOperationException>(settings.Validate);
    }

    [Fact]
    public void ConfigurationRejectsDuplicateUsername()
    {
        var settings = Settings();
        settings.Users.Add(new MockportenUser { Username = settings.Users[0].Username, PidHash = new string('b', 64) });
        Assert.Throws<InvalidOperationException>(settings.Validate);
    }

    [Fact]
    public void ConfigurationRejectsInvalidHash()
    {
        var settings = Settings();
        settings.Users[0].PidHash = "01818520030";
        Assert.Throws<InvalidOperationException>(settings.Validate);
    }

    [Fact]
    public void ConfigurationRequiresHttps()
    {
        var settings = Settings();
        settings.MetadataAddress = "http://mockporten.example/discovery";
        Assert.Throws<InvalidOperationException>(settings.Validate);
    }

    [Fact]
    public void OpenIdConnectUsesIsolatedSchemeAndStrictValidation()
    {
        var settings = Settings();
        var options = new OpenIdConnectOptions();
        MockportenAuthentication.Configure(options, settings);
        Assert.Equal("/mockporten-signin", options.CallbackPath);
        Assert.True(options.UsePkce);
        Assert.True(options.RequireHttpsMetadata);
        Assert.True(options.TokenValidationParameters.ValidateAudience);
        Assert.True(options.TokenValidationParameters.ValidateLifetime);
        Assert.False(options.GetClaimsFromUserInfoEndpoint);
        Assert.Equal(["openid"], options.Scope);
        Assert.Equal(settings.Issuer, options.TokenValidationParameters.IssuerValidator(settings.Issuer, null!, null!));
        Assert.Throws<SecurityTokenInvalidIssuerException>(() =>
            options.TokenValidationParameters.IssuerValidator("https://untrusted.example", null!, null!)
        );
    }

    [Theory]
    [InlineData(false, true)]
    [InlineData(true, false)]
    public async Task DisabledOrRemovedAccountsRejectExistingSession(bool enabled, bool listed)
    {
        var settings = Settings();
        settings.Enabled = enabled;
        if (!listed)
            settings.Users.Clear();
        using var services = new ServiceCollection().AddSingleton(TimeProvider.System).BuildServiceProvider();
        var properties = new AuthenticationProperties();
        properties.StoreTokens([
            new AuthenticationToken { Name = "expires_at", Value = DateTimeOffset.UtcNow.AddHours(1).ToString("o") },
        ]);
        var principal = TestUser();
        var context = new CookieValidatePrincipalContext(
            new DefaultHttpContext { RequestServices = services },
            new AuthenticationScheme("Cookies", null, typeof(CookieAuthenticationHandler)),
            new CookieAuthenticationOptions(),
            new AuthenticationTicket(principal, properties, "Cookies")
        );
        await MockportenAuthentication.ValidateSession(context, settings);
        Assert.Null(context.Principal);
    }

    [Theory]
    [InlineData("Repository", "Search", null, true)]
    [InlineData("User", "Current", null, true)]
    [InlineData("Home", "Logout", null, true)]
    [InlineData("AppDevelopment", "Get", "ttd", true)]
    [InlineData("AppDevelopment", "Get", "other", false)]
    [InlineData("AppDevelopment", "Get", "TTD", false)]
    [InlineData("AppScopes", "UpsertAppScopes", "ttd", false)]
    [InlineData("BotAccounts", "Create", "ttd", false)]
    [InlineData("ApiKeys", "Create", null, false)]
    [InlineData("Admin", "Get", "ttd", false)]
    [InlineData("Repository", "CopyApp", "ttd", false)]
    [InlineData("NewController", "UnreviewedAction", null, false)]
    public void AccessIsRestricted(string controller, string action, string? org, bool expected) =>
        Assert.Equal(expected, MockportenAccessFilter.IsAllowed(ActionContext(controller, action, org)));

    [Theory]
    [InlineData("ttd", true)]
    [InlineData("other", false)]
    public void CreateAppValidatesBodyOrganization(string org, bool expected)
    {
        var context = ActionContext("Repository", "CreateApp", null);
        context.ActionArguments["request"] = new CreateAppRequest { Org = org };
        Assert.Equal(expected, MockportenAccessFilter.IsAllowed(context));
    }

    [Fact]
    public async Task NormalUsersAreNotRestricted()
    {
        var context = ActionContext("Anything", "Anything", "other");
        bool called = false;
        await new MockportenAccessFilter().OnActionExecutionAsync(
            context,
            () =>
            {
                called = true;
                return Task.FromResult(new ActionExecutedContext(context, [], new object()));
            }
        );
        Assert.True(called);
    }

    [Fact]
    public async Task TestUserReceivesForbiddenBeforeActionExecutes()
    {
        var context = ActionContext("ApiKeys", "Create", null);
        context.HttpContext.User = TestUser();
        await new MockportenAccessFilter().OnActionExecutionAsync(
            context,
            () => throw new Exception("Must not execute")
        );
        Assert.Equal(403, Assert.IsType<ObjectResult>(context.Result).StatusCode);
    }

    [Theory]
    [InlineData("Releases", "POST", false)]
    [InlineData("Deployments", "POST", false)]
    [InlineData("Deployments", "DELETE", false)]
    [InlineData("Releases", "GET", true)]
    [InlineData("Deployments", "GET", true)]
    public void PipelineOperationsCannotMintCredentials(string controller, string method, bool expected)
    {
        var context = ActionContext(controller, "Action", "ttd");
        context.HttpContext.Request.Method = method;
        Assert.Equal(expected, MockportenAccessFilter.IsAllowed(context));
    }

    internal static ClaimsPrincipal TestUser() =>
        new(
            new ClaimsIdentity(
                [
                    new Claim(ClaimTypes.Name, "mockporten-editor"),
                    new Claim(StudioAuthenticationProviders.ClaimType, StudioAuthenticationProviders.Mockporten),
                    new Claim(StudioAuthenticationProviders.MockportenPidHashClaim, new string('a', 64)),
                ],
                "Cookies"
            )
        );

    private static MockportenSettings Settings() =>
        new()
        {
            Enabled = true,
            Users = [new MockportenUser { PidHash = new string('a', 64), Username = "mockporten-editor" }],
        };

    private static ActionExecutingContext ActionContext(string controller, string action, string? org)
    {
        var routes = new RouteData();
        if (org is not null)
            routes.Values["org"] = org;
        return new ActionExecutingContext(
            new ActionContext(
                new DefaultHttpContext(),
                routes,
                new ControllerActionDescriptor { ControllerName = controller, ActionName = action },
                new ModelStateDictionary()
            ),
            new List<IFilterMetadata>(),
            new Dictionary<string, object?>(),
            new object()
        );
    }
}
