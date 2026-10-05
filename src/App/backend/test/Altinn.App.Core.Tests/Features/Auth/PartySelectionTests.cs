using System.Globalization;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Tests.Common.Auth;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Register.Enums;
using Altinn.Platform.Register.Models;

namespace Altinn.App.Core.Tests.Features.Auth;

public class PartySelectionTests
{
    private const int UserId = TestAuthentication.DefaultUserId;
    private const int UserPartyId = TestAuthentication.DefaultUserPartyId;
    private const int OrgPartyId = 50012345;
    private const int UnresolvablePartyId = 51099999;

    // Fresh instances per test: FilterPartiesByAllowedPartyTypes mutates the parties it is given.
    private sealed class Fixture
    {
        public Party User { get; } =
            new()
            {
                PartyId = UserPartyId,
                PartyTypeName = PartyType.Person,
                SSN = "12345678901",
                Name = "Test Testesen",
            };

        public Party Org { get; } =
            new()
            {
                PartyId = OrgPartyId,
                PartyTypeName = PartyType.Organisation,
                UnitType = "AS",
                OrgNumber = "910000001",
                Name = "Org AS",
            };

        public Party? Lookup(int partyId) =>
            partyId switch
            {
                UserPartyId => User,
                OrgPartyId => Org,
                _ => null,
            };

        public Authenticated.User Parse(
            IReadOnlyList<string> partyCookies,
            Func<int, Task<Party?>>? lookupParty = null,
            bool expectValidateCall = false
        ) =>
            Assert.IsType<Authenticated.User>(
                Authenticated.From(
                    tokenStr: TestAuthentication.GetUserToken(UserId, UserPartyId),
                    parsedToken: null,
                    isAuthenticated: true,
                    appMetadata: TestAuthentication.NewApplicationMetadata("ttd"),
                    getSelectedPartyCookieValues: () => partyCookies,
                    getUserProfile: _ =>
                        Task.FromResult<UserProfile?>(
                            new UserProfile
                            {
                                UserId = UserId,
                                PartyId = UserPartyId,
                                Party = User,
                            }
                        ),
                    lookupUserParty: lookupParty ?? (partyId => Task.FromResult(Lookup(partyId))),
                    lookupOrgParty: null!,
                    getPartyList: _ => Task.FromResult<List<Party>?>([User, Org]),
                    validateSelectedParty: (_, _) =>
                        expectValidateCall
                            ? Task.FromResult<bool?>(true)
                            : throw new Exception("Validation must not run for a selection that was never resolved")
                )
            );
    }

    private static string Cookie(int partyId) => partyId.ToString(CultureInfo.InvariantCulture);

    [Theory]
    [InlineData("not-a-number")]
    [InlineData("1.5")]
    public async Task Unparseable_Cookie_Surfaces_As_CanRepresent_False(string cookieValue)
    {
        var auth = new Fixture().Parse([cookieValue]);

        Assert.Equal(UserPartyId, auth.SelectedPartyId);

        var details = await auth.LoadDetails(validateSelectedParty: true);

        Assert.False(details.CanRepresent);
        Assert.False(details.RepresentsSelf);
        Assert.Equal(UserPartyId, details.SelectedParty.PartyId);
    }

    [Fact]
    public async Task Conflicting_Cookie_Copies_Are_Unusable_Without_Any_Lookup()
    {
        var f = new Fixture();
        var lookups = 0;
        var auth = f.Parse(
            [Cookie(OrgPartyId), Cookie(UnresolvablePartyId)],
            lookupParty: partyId =>
            {
                lookups++;
                return Task.FromResult(f.Lookup(partyId));
            }
        );

        Assert.Equal(UserPartyId, auth.SelectedPartyId);

        var details = await auth.LoadDetails(validateSelectedParty: true);

        Assert.False(details.CanRepresent);
        Assert.False(details.RepresentsSelf);
        Assert.Equal(UserPartyId, details.SelectedParty.PartyId);
        Assert.Equal(0, lookups);
    }

    [Fact]
    public async Task Agreeing_Cookie_Copies_Are_One_Selection()
    {
        var auth = new Fixture().Parse([Cookie(OrgPartyId), Cookie(OrgPartyId)], expectValidateCall: true);

        Assert.Equal(OrgPartyId, auth.SelectedPartyId);

        var details = await auth.LoadDetails(validateSelectedParty: true);

        Assert.Equal(OrgPartyId, details.SelectedParty.PartyId);
        Assert.True(details.CanRepresent);
    }

    [Fact]
    public async Task Unresolvable_Selection_Yields_CanRepresent_False_Without_Validation()
    {
        var f = new Fixture();
        var lookups = 0;
        var auth = f.Parse(
            [Cookie(UnresolvablePartyId)],
            lookupParty: partyId =>
            {
                lookups++;
                return Task.FromResult(f.Lookup(partyId));
            }
        );

        var details = await auth.LoadDetails(validateSelectedParty: true);

        Assert.Equal(1, lookups);
        Assert.Equal(UnresolvablePartyId, auth.SelectedPartyId);
        Assert.Equal(UserPartyId, details.SelectedParty.PartyId);
        Assert.False(details.RepresentsSelf);
        Assert.False(details.CanRepresent);
    }

    [Fact]
    public async Task Transient_Lookup_Failure_Still_Throws()
    {
        var f = new Fixture();
        var auth = f.Parse(
            [Cookie(UnresolvablePartyId)],
            lookupParty: partyId =>
                partyId == UserPartyId
                    ? Task.FromResult<Party?>(f.User)
                    : throw new HttpRequestException("register is down")
        );

        await Assert.ThrowsAsync<HttpRequestException>(() => auth.LoadDetails(validateSelectedParty: true));
    }

    [Fact]
    public async Task LookupSelectedParty_Throws_For_Unresolvable_Even_After_LoadDetails_Cached_The_Fallback()
    {
        var auth = new Fixture().Parse([Cookie(UnresolvablePartyId)]);
        var details = await auth.LoadDetails();
        Assert.Equal(UserPartyId, details.SelectedParty.PartyId);

        await Assert.ThrowsAsync<InvalidOperationException>(() => auth.LookupSelectedParty());
    }

    [Fact]
    public async Task LookupSelectedParty_Uses_The_Cache_When_It_Is_The_Selected_Party()
    {
        var f = new Fixture();
        var lookups = 0;
        var auth = f.Parse(
            [Cookie(OrgPartyId)],
            lookupParty: partyId =>
            {
                lookups++;
                return Task.FromResult(f.Lookup(partyId));
            }
        );

        await auth.LoadDetails();
        var party = await auth.LookupSelectedParty();

        Assert.Equal(OrgPartyId, party.PartyId);
        Assert.Equal(1, lookups);
    }
}
