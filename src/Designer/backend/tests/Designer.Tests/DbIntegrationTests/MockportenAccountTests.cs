#nullable enable
using System;
using System.Globalization;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Infrastructure.StudioOidc;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.ApiKey;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.ORMImplementation.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Fixtures;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.DbIntegrationTests;

public class MockportenAccountTests(DesignerDbFixture fixture) : DbIntegrationTestsBase(fixture)
{
    [Fact]
    public async Task ApiKeyCannotBeCreatedForTestAccount()
    {
        var (_, user) = Settings();
        await InsertAccount(user, StudioAuthenticationProviders.Mockporten);
        var service = new ApiKeyService(
            Mock.Of<IApiKeyRepository>(),
            DbFixture.DbContext,
            new ApiKeySettings { MaxExpiryDays = 30 },
            TimeProvider.System
        );
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            service.CreateAsync(user.Username, "test", ApiKeyType.System, DateTimeOffset.UtcNow.AddDays(1))
        );
    }

    [Fact]
    public async Task ApiKeyFromTestAccountIsRejectedEvenIfAlreadyStored()
    {
        var repository = new Mock<IApiKeyRepository>();
        repository
            .Setup(repo => repo.GetByKeyHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new ApiKeyDbModel
                {
                    ExpiresAt = DateTimeOffset.UtcNow.AddDays(1),
                    UserAccount = new UserAccountDbModel
                    {
                        AuthenticationProvider = StudioAuthenticationProviders.Mockporten,
                    },
                }
            );
        var service = new ApiKeyService(
            repository.Object,
            DbFixture.DbContext,
            new ApiKeySettings { HashSalt = "test-salt" },
            TimeProvider.System
        );
        Assert.Null(await service.ValidateAsync("test-key"));
    }

    [Fact]
    public async Task NewAccountIsCreatedOnceAndMarked()
    {
        var (settings, user) = Settings();
        await CreateGiteaLookupTable();
        var provisioning = new Mock<IUserProvisioningService>();
        var service = Service(settings, provisioning.Object);
        Assert.Equal(user.Username, await service.ResolveAsync(user.PidHash));
        Assert.Equal(user.Username, await service.ResolveAsync(user.PidHash));
        var account = await DbFixture.DbContext.UserAccounts.SingleAsync(x => x.Username == user.Username);
        Assert.Equal(StudioAuthenticationProviders.Mockporten, account.AuthenticationProvider);
        Assert.Equal(user.PidHash, account.PidHash);
        provisioning.Verify(
            x => x.EnsureUserExistsAsync(user.Username, "Studio test account", It.IsAny<CancellationToken>()),
            Times.Exactly(2)
        );
    }

    [Theory]
    [InlineData(null, false)]
    [InlineData("ansattporten", false)]
    [InlineData("mockporten", true)]
    public async Task ExistingHumanOrDeactivatedAccountIsRejected(string? provider, bool deactivated)
    {
        var (settings, user) = Settings();
        await InsertAccount(user, provider, deactivated);
        var provisioning = new Mock<IUserProvisioningService>(MockBehavior.Strict);
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            Service(settings, provisioning.Object).ResolveAsync(user.PidHash)
        );
    }

    [Fact]
    public async Task ExistingGiteaUsernameIsNotLinked()
    {
        var (settings, user) = Settings();
        await CreateGiteaLookupTable();
        await DbFixture.DbContext.Database.ExecuteSqlInterpolatedAsync(
            $"INSERT INTO public.\"user\" (lower_name) VALUES ({user.Username})"
        );
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            Service(settings, Mock.Of<IUserProvisioningService>()).ResolveAsync(user.PidHash)
        );
        Assert.False(await DbFixture.DbContext.UserAccounts.AnyAsync(x => x.Username == user.Username));
    }

    [Fact]
    public async Task ChangingConfiguredUsernameDoesNotReassignAccount()
    {
        var (settings, user) = Settings();
        await InsertAccount(user, StudioAuthenticationProviders.Mockporten);
        user.Username = "mockporten-different";
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            Service(settings, Mock.Of<IUserProvisioningService>()).ResolveAsync(user.PidHash)
        );
    }

    [Fact]
    public async Task MissingConfigurationRejectsLoginWithoutCreatingAccount()
    {
        var (settings, user) = Settings();
        settings.Users.Clear();
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            Service(settings, Mock.Of<IUserProvisioningService>()).ResolveAsync(user.PidHash)
        );
        Assert.False(await DbFixture.DbContext.UserAccounts.AnyAsync(x => x.PidHash == user.PidHash));
    }

    [Fact]
    public async Task AnsattportenCannotResolveTestAccount()
    {
        var (_, user) = Settings();
        await InsertAccount(user, StudioAuthenticationProviders.Mockporten);
        var service = new GiteaDbStudioOidcUsernameProvider(
            DbFixture.DbContext,
            new GiteaDbSettings(),
            TimeProvider.System
        );
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            service.ResolveUsernameAsync("any-sub", PidHash.FromHashedValue(user.PidHash), null, null)
        );
    }

    [Fact]
    public async Task LegacyHumanAccountStillResolves()
    {
        var user = new MockportenUser
        {
            Username = "developer-" + Guid.NewGuid().ToString("N"),
            PidHash = Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N"),
        };
        await InsertAccount(user, null);
        var service = new GiteaDbStudioOidcUsernameProvider(
            DbFixture.DbContext,
            new GiteaDbSettings(),
            TimeProvider.System
        );
        Assert.Equal(
            user.Username,
            await service.ResolveUsernameAsync("existing-sub", PidHash.FromHashedValue(user.PidHash), null, null)
        );
    }

    [Fact]
    public async Task CallbackUsesPidNotChangingSubjectAndDropsUpstreamTokens()
    {
        const string syntheticPid = "01818520030";
        var mappingSettings = new DeveloperMappingSettings { PidHashSalt = Guid.NewGuid().ToString() };
        var (settings, user) = Settings();
        user.PidHash = PidHash.FromPid(syntheticPid, mappingSettings).Value;
        await InsertAccount(user, StudioAuthenticationProviders.Mockporten);
        using var services = Services(settings, mappingSettings);
        var expires = DateTimeOffset.FromUnixTimeSeconds(DateTimeOffset.UtcNow.AddMinutes(30).ToUnixTimeSeconds());
        for (int i = 0; i < 2; i++)
        {
            var properties = Properties(expires);
            var incoming = new ClaimsPrincipal(
                new ClaimsIdentity([new Claim("pid", syntheticPid), new Claim("sub", Guid.NewGuid().ToString())])
            );
            var context = new TicketReceivedContext(
                new DefaultHttpContext { RequestServices = services },
                new AuthenticationScheme("Mockporten", null, typeof(OpenIdConnectHandler)),
                new OpenIdConnectOptions(),
                new AuthenticationTicket(incoming, properties, "Mockporten")
            );
            await MockportenAuthentication.ResolveIdentity(context);
            Assert.Null(context.Result);
            Assert.Equal(user.Username, context.Principal!.Identity!.Name);
            Assert.True(StudioAuthenticationProviders.IsMockporten(context.Principal));
            var resolvedProperties = Assert.IsType<AuthenticationProperties>(context.Properties);
            Assert.Null(resolvedProperties.GetTokenValue("refresh_token"));
            Assert.Null(resolvedProperties.GetTokenValue("access_token"));
            Assert.Equal(expires, resolvedProperties.ExpiresUtc);
            Assert.False(resolvedProperties.AllowRefresh);
        }
    }

    [Theory]
    [InlineData(-1, true, false)]
    [InlineData(30, true, true)]
    [InlineData(30, false, false)]
    public async Task SessionRequiresUnexpiredTokenAndActiveAccount(int minutes, bool active, bool expected)
    {
        var (settings, user) = Settings();
        await InsertAccount(user, StudioAuthenticationProviders.Mockporten, !active);
        using var services = Services(settings, new DeveloperMappingSettings());
        var principal = new ClaimsPrincipal(
            new ClaimsIdentity(
                [
                    new Claim(ClaimTypes.Name, user.Username),
                    new Claim(StudioAuthenticationProviders.ClaimType, StudioAuthenticationProviders.Mockporten),
                    new Claim(StudioAuthenticationProviders.MockportenPidHashClaim, user.PidHash),
                ],
                "Cookies"
            )
        );
        var context = new CookieValidatePrincipalContext(
            new DefaultHttpContext { RequestServices = services },
            new AuthenticationScheme("Cookies", null, typeof(CookieAuthenticationHandler)),
            new CookieAuthenticationOptions(),
            new AuthenticationTicket(principal, Properties(DateTimeOffset.UtcNow.AddMinutes(minutes)), "Cookies")
        );
        await MockportenAuthentication.ValidateSession(context, settings);
        Assert.Equal(expected, context.Principal is not null);
        Assert.False(context.ShouldRenew);
    }

    private MockportenAccountService Service(MockportenSettings settings, IUserProvisioningService provisioning) =>
        new(
            DbFixture.DbContext,
            new GiteaDbSettings { ConnectionString = DbFixture.ConnectionString },
            settings,
            provisioning,
            TimeProvider.System
        );

    private ServiceProvider Services(MockportenSettings settings, DeveloperMappingSettings mappingSettings) =>
        new ServiceCollection()
            .AddSingleton(TimeProvider.System)
            .AddSingleton(DbFixture.DbContext)
            .AddSingleton(mappingSettings)
            .AddSingleton(Service(settings, Mock.Of<IUserProvisioningService>()))
            .BuildServiceProvider();

    private async Task InsertAccount(MockportenUser user, string? provider, bool deactivated = false)
    {
        DbFixture.DbContext.UserAccounts.Add(
            new UserAccountDbModel
            {
                Username = user.Username,
                PidHash = user.PidHash,
                AuthenticationProvider = provider,
                Created = DateTimeOffset.UtcNow,
                Deactivated = deactivated,
            }
        );
        await DbFixture.DbContext.SaveChangesAsync();
    }

    private Task CreateGiteaLookupTable() =>
        DbFixture.DbContext.Database.ExecuteSqlRawAsync(
            "CREATE TABLE IF NOT EXISTS public.\"user\" (lower_name text NOT NULL)"
        );

    private static (MockportenSettings, MockportenUser) Settings()
    {
        var user = new MockportenUser
        {
            Username = "mockporten-" + Guid.NewGuid().ToString("N")[..20],
            PidHash = Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N"),
        };
        return (new MockportenSettings { Enabled = true, Users = [user] }, user);
    }

    private static AuthenticationProperties Properties(DateTimeOffset expiry)
    {
        var properties = new AuthenticationProperties();
        properties.StoreTokens([
            new AuthenticationToken { Name = "expires_at", Value = expiry.ToString("o", CultureInfo.InvariantCulture) },
            new AuthenticationToken { Name = "access_token", Value = "must-not-be-forwarded" },
            new AuthenticationToken { Name = "refresh_token", Value = "unsupported" },
        ]);
        return properties;
    }
}
