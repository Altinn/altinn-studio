using Altinn.App.Core.Infrastructure.Clients.Secrets;

namespace Altinn.App.Core.Tests.Infrastructure.Clients.Secrets;

public class AppCodeRotationTests
{
    private static readonly DateTimeOffset _now = new(2026, 6, 1, 12, 0, 0, TimeSpan.Zero);
    private static readonly TimeSpan _grace = AppCodeRotation.SigningGracePeriod;

    private static AppCode Code(string id, DateTimeOffset issuedAt, DateTimeOffset? expiresAt = null) =>
        new()
        {
            Id = id,
            Code = $"{id}-secret-that-is-long-enough",
            IssuedAt = issuedAt,
            ExpiresAt = expiresAt ?? issuedAt.AddDays(365),
        };

    [Fact]
    public void SigningGracePeriod_IsOneHour()
    {
        // The workflow engine's CallbackTokenLifetimeInvariantTests subtract this hour from the token validity
        // the operator guarantees. Change both together.
        Assert.Equal(TimeSpan.FromHours(1), AppCodeRotation.SigningGracePeriod);
    }

    [Fact]
    public void SelectSigningCode_NewCodeInsideGracePeriod_SignsWithThePreviousCode()
    {
        AppCode[] codes = [Code("new", _now - _grace + TimeSpan.FromSeconds(1)), Code("old", _now.AddDays(-24))];

        Assert.Equal("old", AppCodeRotation.SelectSigningCode(codes, _now)?.Id);
    }

    [Fact]
    public void SelectSigningCode_NewCodeAtTheEndOfTheGracePeriod_SignsWithIt()
    {
        AppCode[] codes = [Code("new", _now - _grace), Code("old", _now.AddDays(-24))];

        Assert.Equal("new", AppCodeRotation.SelectSigningCode(codes, _now)?.Id);
    }

    [Fact]
    public void SelectSigningCode_SeveralCodesPastTheGracePeriod_SignsWithTheNewest()
    {
        AppCode[] codes =
        [
            Code("older", _now.AddDays(-48)),
            Code("newer", _now.AddDays(-24)),
            Code("oldest", _now.AddDays(-72)),
        ];

        Assert.Equal("newer", AppCodeRotation.SelectSigningCode(codes, _now)?.Id);
    }

    [Fact]
    public void SelectSigningCode_NoCodePastTheGracePeriod_FallsBackToTheNewest()
    {
        AppCode[] codes = [Code("first", _now.AddMinutes(-10)), Code("second", _now.AddMinutes(-5))];

        Assert.Equal("second", AppCodeRotation.SelectSigningCode(codes, _now)?.Id);
    }

    [Fact]
    public void SelectSigningCode_OnlyCodeIsInsideTheGracePeriod_SignsWithIt()
    {
        AppCode[] codes = [Code("first", _now.AddMinutes(-1))];

        Assert.Equal("first", AppCodeRotation.SelectSigningCode(codes, _now)?.Id);
    }

    [Fact]
    public void SelectSigningCode_CodeIssuedInTheFuture_IsInsideTheGracePeriod()
    {
        // The operator's clock can run ahead of the pod's.
        AppCode[] codes = [Code("ahead", _now.AddMinutes(2)), Code("old", _now.AddDays(-24))];

        Assert.Equal("old", AppCodeRotation.SelectSigningCode(codes, _now)?.Id);
    }

    [Fact]
    public void SelectSigningCode_ExpiredCodePastTheGracePeriod_IsSkipped()
    {
        AppCode[] codes =
        [
            Code("new", _now.AddDays(-2)),
            Code("expired", _now.AddDays(-1), expiresAt: _now.AddSeconds(-1)),
            Code("old", _now.AddDays(-3)),
        ];

        Assert.Equal("new", AppCodeRotation.SelectSigningCode(codes, _now)?.Id);
    }

    [Fact]
    public void SelectSigningCode_CodeExpiringNow_IsSkipped()
    {
        AppCode[] codes = [Code("expiring", _now.AddDays(-1), expiresAt: _now), Code("old", _now.AddDays(-2))];

        Assert.Equal("old", AppCodeRotation.SelectSigningCode(codes, _now)?.Id);
    }

    [Fact]
    public void SelectSigningCode_OnlyExpiredCodesPastTheGracePeriod_FallsBackToTheNewestUnexpired()
    {
        AppCode[] codes =
        [
            Code("new", _now.AddMinutes(-5)),
            Code("expired", _now.AddDays(-1), expiresAt: _now.AddSeconds(-1)),
        ];

        Assert.Equal("new", AppCodeRotation.SelectSigningCode(codes, _now)?.Id);
    }

    [Fact]
    public void SelectSigningCode_AllCodesExpired_ReturnsNull()
    {
        AppCode[] codes = [Code("expired", _now.AddDays(-2), expiresAt: _now.AddDays(-1))];

        Assert.Null(AppCodeRotation.SelectSigningCode(codes, _now));
    }

    [Fact]
    public void SelectSigningCode_NoCodes_ReturnsNull()
    {
        Assert.Null(AppCodeRotation.SelectSigningCode([], _now));
    }

    [Fact]
    public void SelectSigningCode_CodesWithTheSameIssuedAt_SignsWithTheFirstListed()
    {
        AppCode[] codes = [Code("first", _now.AddDays(-1)), Code("second", _now.AddDays(-1))];

        Assert.Equal("first", AppCodeRotation.SelectSigningCode(codes, _now)?.Id);
    }

    [Fact]
    public void SelectSigningCode_CodeWithoutIssuedAt_CountsAsIssuedLongAgo()
    {
        AppCode withoutIssuedAt = Code("without", default, expiresAt: _now.AddDays(1));
        AppCode[] codes = [Code("new", _now.AddMinutes(-5)), withoutIssuedAt];

        Assert.Equal("without", AppCodeRotation.SelectSigningCode(codes, _now)?.Id);
    }

    [Fact]
    public void SelectSigningCode_CodeWithoutIssuedAt_LosesToANewerCodePastTheGracePeriod()
    {
        AppCode withoutIssuedAt = Code("without", default, expiresAt: _now.AddDays(1));
        AppCode[] codes = [withoutIssuedAt, Code("issued", _now.AddDays(-1))];

        Assert.Equal("issued", AppCodeRotation.SelectSigningCode(codes, _now)?.Id);
    }
}
