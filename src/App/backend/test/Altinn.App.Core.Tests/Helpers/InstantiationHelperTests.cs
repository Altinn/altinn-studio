using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Models;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Register.Enums;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using Moq;

namespace Altinn.App.Core.Tests.Helpers;

public class InstantiationHelperTests
{
    [Fact]
    public async Task PartyToInstanceOwner_SelfIdentifiedWithEmail_ReturnsInstanceOwnerWithEmail()
    {
        // Arrange
        var party = new Party
        {
            PartyId = 12345,
            PartyTypeName = PartyType.SelfIdentified,
            Name = "epost:test@example.com",
        };

        var authenticationContextMock = new Mock<IAuthenticationContext>();
        var authenticatedUser = CreateAuthenticatedUser(
            userId: 1337,
            partyId: 12345,
            externalIdentity: "urn:altinn:person:idporten-email:test@example.com"
        );
        authenticationContextMock.SetupGet(a => a.Current).Returns(authenticatedUser);

        // Act
        InstanceOwner instanceOwner = await InstantiationHelper.PartyToInstanceOwner(
            party,
            authenticationContextMock.Object
        );

        // Assert
        Assert.Equal("12345", instanceOwner.PartyId);
        Assert.Equal("epost:test@example.com", instanceOwner.Username);
        Assert.Equal("urn:altinn:person:idporten-email:test@example.com", instanceOwner.ExternalIdentifier);
    }

    [Fact]
    public async Task PartyToInstanceOwner_SelfIdentifiedWithUsername_ReturnsInstanceOwnerWithUsername()
    {
        // Arrange
        var party = new Party
        {
            PartyId = 12345,
            PartyTypeName = PartyType.SelfIdentified,
            Name = "Test User",
        };

        var authenticationContextMock = new Mock<IAuthenticationContext>();
        var authenticatedUser = CreateAuthenticatedUser(userId: 1337, partyId: 12345, externalIdentity: null);
        authenticationContextMock.SetupGet(a => a.Current).Returns(authenticatedUser);

        // Act
        InstanceOwner instanceOwner = await InstantiationHelper.PartyToInstanceOwner(
            party,
            authenticationContextMock.Object
        );

        // Assert
        Assert.Equal("12345", instanceOwner.PartyId);
        Assert.Equal("Test User", instanceOwner.Username);
        Assert.Null(instanceOwner.ExternalIdentifier);
    }

    [Fact]
    public async Task PartyToInstanceOwner_PersonWithSSN_ReturnsInstanceOwnerWithPersonNumber()
    {
        // Arrange
        var party = new Party
        {
            PartyId = 12345,
            PartyTypeName = PartyType.Person,
            SSN = "12345678901",
        };

        var authenticationContextMock = new Mock<IAuthenticationContext>();

        // Act
        InstanceOwner instanceOwner = await InstantiationHelper.PartyToInstanceOwner(
            party,
            authenticationContextMock.Object
        );

        // Assert
        Assert.Equal("12345", instanceOwner.PartyId);
        Assert.Equal("12345678901", instanceOwner.PersonNumber);
        Assert.Null(instanceOwner.ExternalIdentifier);
        Assert.Null(instanceOwner.Username);
    }

    [Fact]
    public async Task PartyToInstanceOwner_OrganisationWithOrgNumber_ReturnsInstanceOwnerWithOrganisationNumber()
    {
        // Arrange
        var party = new Party
        {
            PartyId = 12345,
            PartyTypeName = PartyType.Organisation,
            OrgNumber = "991825827",
        };

        var authenticationContextMock = new Mock<IAuthenticationContext>();

        // Act
        InstanceOwner instanceOwner = await InstantiationHelper.PartyToInstanceOwner(
            party,
            authenticationContextMock.Object
        );

        // Assert
        Assert.Equal("12345", instanceOwner.PartyId);
        Assert.Equal("991825827", instanceOwner.OrganisationNumber);
        Assert.Null(instanceOwner.Username);
        Assert.Null(instanceOwner.ExternalIdentifier);
    }

    [Fact]
    public async Task GetExternalIdentityForSelfIdentifiedParty_WhenPartySelfIdentified_ReturnsExternalIdentity()
    {
        // Arrange
        var party = new Party { PartyId = 12345, PartyTypeName = PartyType.SelfIdentified };

        var authenticationContextMock = new Mock<IAuthenticationContext>();
        var authenticatedUser = CreateAuthenticatedUser(
            userId: 1337,
            partyId: 12345,
            externalIdentity: "urn:altinn:person:idporten-email:test@example.com"
        );
        authenticationContextMock.SetupGet(a => a.Current).Returns(authenticatedUser);

        // Act
        var result = await InstantiationHelper.GetExternalIdentityForSelfIdentifiedParty(
            party,
            authenticationContextMock.Object
        );

        // Assert
        Assert.Equal("urn:altinn:person:idporten-email:test@example.com", result);
    }

    [Fact]
    public async Task GetExternalIdentityForSelfIdentifiedParty_WhenPartySelfIdentified_ButNoExternalIdentity_ReturnsNull()
    {
        // Arrange
        var party = new Party { PartyId = 12345, PartyTypeName = PartyType.SelfIdentified };

        var authenticationContextMock = new Mock<IAuthenticationContext>();
        var authenticatedUser = CreateAuthenticatedUser(userId: 1337, partyId: 12345, externalIdentity: null);
        authenticationContextMock.SetupGet(a => a.Current).Returns(authenticatedUser);

        // Act
        var result = await InstantiationHelper.GetExternalIdentityForSelfIdentifiedParty(
            party,
            authenticationContextMock.Object
        );

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetExternalIdentityForSelfIdentifiedParty_WhenPartyNotSelfIdentified_ReturnsNull()
    {
        // Arrange
        var party = new Party { PartyId = 12345, PartyTypeName = PartyType.Person };

        var authenticationContextMock = new Mock<IAuthenticationContext>();

        // Act
        var result = await InstantiationHelper.GetExternalIdentityForSelfIdentifiedParty(
            party,
            authenticationContextMock.Object
        );

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetExternalIdentityForSelfIdentifiedParty_WhenNotAuthenticatedAsUser_ReturnsNull()
    {
        // Arrange
        var party = new Party { PartyId = 12345, PartyTypeName = PartyType.SelfIdentified };

        var authenticationContextMock = new Mock<IAuthenticationContext>();
        var authenticatedOrg = CreateAuthenticatedOrg(orgNo: "991825827");
        authenticationContextMock.SetupGet(a => a.Current).Returns(authenticatedOrg);

        // Act
        var result = await InstantiationHelper.GetExternalIdentityForSelfIdentifiedParty(
            party,
            authenticationContextMock.Object
        );

        // Assert
        Assert.Null(result);
    }

    private static Authenticated.User CreateAuthenticatedUser(int userId, int partyId, string? externalIdentity)
    {
        var party = new Party
        {
            PartyId = partyId,
            PartyTypeName = PartyType.SelfIdentified,
            Name = "Test User",
        };

        var userProfile = new UserProfile
        {
            UserId = userId,
            PartyId = partyId,
            ExternalIdentity = externalIdentity,
            Party = party,
        };

        var token = TestAuthentication.GetSelfIdentifiedUserToken(userId: userId, partyId: partyId);

        var auth = Authenticated.From(
            tokenStr: token,
            parsedToken: null,
            isAuthenticated: true,
            appMetadata: new ApplicationMetadata("tdd/test"),
            getSelectedParty: () => partyId.ToString(),
            getUserProfile: (id) => Task.FromResult<UserProfile?>(userProfile),
            lookupUserParty: (id) => Task.FromResult<Party?>(party),
            lookupOrgParty: (orgNo) => Task.FromResult(new Party()),
            getPartyList: (id) => Task.FromResult<List<Party>?>(new List<Party>()),
            validateSelectedParty: (uid, pid) => Task.FromResult<bool?>(true)
        );

        return (Authenticated.User)auth;
    }

    private static Authenticated.Org CreateAuthenticatedOrg(string orgNo)
    {
        var party = new Party
        {
            PartyId = 5001337,
            PartyTypeName = PartyType.Organisation,
            OrgNumber = orgNo,
            Name = "Test Org",
        };

        var token = App.Tests.Common.Auth.TestAuthentication.GetOrgToken(orgNumber: orgNo);

        var auth = Authenticated.From(
            tokenStr: token,
            parsedToken: null,
            isAuthenticated: true,
            appMetadata: new ApplicationMetadata("tdd/test"),
            getSelectedParty: () => null,
            getUserProfile: (id) => Task.FromResult<UserProfile?>(null),
            lookupUserParty: (id) => Task.FromResult<Party?>(null),
            lookupOrgParty: (orgNoParam) => Task.FromResult(party),
            getPartyList: (id) => Task.FromResult<List<Party>?>(null),
            validateSelectedParty: (uid, pid) => Task.FromResult<bool?>(null)
        );

        return (Authenticated.Org)auth;
    }
}
