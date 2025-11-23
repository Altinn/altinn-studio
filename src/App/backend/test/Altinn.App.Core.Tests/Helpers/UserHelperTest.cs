using System.Security.Claims;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Profile;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Tests.Common.Mocks;
using FluentAssertions;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Core.Tests.Helpers;

public class UserHelperTest
{
    private sealed record Fixture(WebApplication App) : IAsyncDisposable
    {
        public readonly IOptions<GeneralSettings> GeneralSettings = Options.Create(new GeneralSettings());
        public IProfileClient ProfileClientMock => App.Services.GetRequiredService<IProfileClient>();
        public IAltinnPartyClient AltinnPartyClientMock => App.Services.GetRequiredService<IAltinnPartyClient>();

        public static Fixture Create(ClaimsPrincipal userPrincipal, string? partyCookieValue = null)
        {
            var app = AppBuilder.Build(overrideAltinnAppServices: services =>
            {
                var httpContextMock = new Mock<HttpContext>();
                httpContextMock.Setup(x => x.Request.Cookies["AltinnPartyId"]).Returns(partyCookieValue);
                httpContextMock.Setup(httpContext => httpContext.User).Returns(userPrincipal);
                var httpContextAccessor = new Mock<IHttpContextAccessor>();
                httpContextAccessor.Setup(x => x.HttpContext).Returns(httpContextMock.Object);

                services.AddSingleton(httpContextAccessor.Object);
                services.AddTransient<IProfileClient, ProfileClientMock>();
                services.AddTransient<IAltinnPartyClient, AltinnPartyClientMock>();
            });
            return new Fixture(app);
        }

        public async ValueTask DisposeAsync() => await App.DisposeAsync();
    }

    [Theory]
    [InlineData(1337, 501337, "01039012345")] // Has `Party` containing correct SSN
    [InlineData(1001, 510001, null)] // Has no SSN, because of empty `Party`
    [InlineData(1337, 510001, "01899699552")] // `Party` mismatch, forcing load via `IAltinnPartyClient`, resulting in SSN belonging to party 510001
    public async Task GetUserContext_PerformsCorrectLogic(int userId, int partyId, string? ssn)
    {
        // Arrange
        const int authLevel = 3;
        var userPrincipal = TestAuthentication.GetUserPrincipal(userId, partyId, authLevel);
        await using var fixture = Fixture.Create(userPrincipal);
        var userHelper = new UserHelper(
            profileClient: fixture.ProfileClientMock,
            altinnPartyClientService: fixture.AltinnPartyClientMock,
            settings: fixture.GeneralSettings
        );
        var httpContextAccessor = fixture.App.Services.GetRequiredService<IHttpContextAccessor>();
        var httpContext = httpContextAccessor.HttpContext;
        var userProfile = await fixture.ProfileClientMock.GetUserProfile(userId);
        var party = partyId.Equals(userProfile!.PartyId)
            ? userProfile!.Party
            : await fixture.AltinnPartyClientMock.GetParty(partyId);

        // Act
        var result = await userHelper.GetUserContext(httpContext!);

        // Assert
        result
            .Should()
            .BeEquivalentTo(
                new Core.Models.UserContext
                {
                    SocialSecurityNumber = ssn,
                    UserName = null,
                    UserId = userId,
                    PartyId = partyId,
                    AuthenticationLevel = authLevel,
                    User = userPrincipal,
                    UserParty = userProfile!.Party,
                    Party = party,
                }
            );
    }

    [Fact]
    public async Task GetUserContext_HandlesMissingClaims()
    {
        // Arrange
        const int userId = 1001;
        const int authLevel = 3;
        var userPrincipal = TestAuthentication.GetUserPrincipal(userId, default, authLevel);
        await using var fixture = Fixture.Create(userPrincipal);
        var userHelper = new UserHelper(
            profileClient: fixture.ProfileClientMock,
            altinnPartyClientService: fixture.AltinnPartyClientMock,
            settings: fixture.GeneralSettings
        );
        var httpContextAccessor = fixture.App.Services.GetRequiredService<IHttpContextAccessor>();
        var httpContext = httpContextAccessor.HttpContext;
        var userProfile = await fixture.ProfileClientMock.GetUserProfile(userId);

        // Act
        var result = await userHelper.GetUserContext(httpContext!);

        // Assert
        result
            .Should()
            .BeEquivalentTo(
                new Core.Models.UserContext
                {
                    SocialSecurityNumber = null,
                    UserName = null,
                    UserId = userId,
                    PartyId = default,
                    AuthenticationLevel = authLevel,
                    User = userPrincipal,
                    UserParty = userProfile!.Party,
                    Party = null,
                }
            );
    }

    [Fact]
    public async Task GetUserContext_ThrowsOnMissingUserId()
    {
        // Arrange
        var userPrincipal = TestAuthentication.GetUserPrincipal(default, default);
        await using var fixture = Fixture.Create(userPrincipal);
        var userHelper = new UserHelper(
            profileClient: fixture.ProfileClientMock,
            altinnPartyClientService: fixture.AltinnPartyClientMock,
            settings: fixture.GeneralSettings
        );
        var httpContextAccessor = fixture.App.Services.GetRequiredService<IHttpContextAccessor>();
        var httpContext = httpContextAccessor.HttpContext;

        // Act
        var act = async () =>
        {
            await userHelper.GetUserContext(httpContext!);
        };

        // Assert
        await act.Should().ThrowAsync<Exception>().WithMessage("*not*ID*from*claims*");
    }
}
