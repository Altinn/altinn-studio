using Altinn.App.Core.Features.Payment.Exceptions;
using Altinn.App.Core.Features.Payment.Processors.Nets;
using Altinn.App.Core.Infrastructure.Clients.Secrets;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using Moq;

namespace Altinn.App.Core.Tests.Features.Payment.Providers.Nets;

public class NetsWebhookSecretProviderTests
{
    private static readonly DateTimeOffset _now = new(2026, 6, 1, 12, 0, 0, TimeSpan.Zero);

    private readonly FakeTimeProvider _time = new(_now);

    private static AppCode Code(string id, DateTimeOffset issuedAt, DateTimeOffset? expiresAt = null) =>
        new()
        {
            Id = id,
            Code = $"{id}-code-that-is-long-enough",
            IssuedAt = issuedAt,
            ExpiresAt = expiresAt ?? issuedAt.AddDays(62),
        };

    private NetsWebhookSecretProvider Pod(params AppCode[] codes) =>
        new(Options(new AppCodesSettings { PaymentsCallback = [.. codes] }), _time);

    private static IOptionsMonitor<AppCodesSettings> Options(AppCodesSettings settings)
    {
        var monitor = new Mock<IOptionsMonitor<AppCodesSettings>>();
        monitor.Setup(m => m.CurrentValue).Returns(settings);
        return monitor.Object;
    }

    [Fact]
    public void GetSigningSecret_NewCodeInsideTheGracePeriod_IsAcceptedByAPodThatHasNotReadIt()
    {
        AppCode newCode = Code("new", _now.AddMinutes(-10));
        AppCode oldCode = Code("old", _now.AddDays(-24));
        var updated = Pod(newCode, oldCode);
        var lagging = Pod(oldCode);

        string registered = updated.GetSigningSecret();

        Assert.True(lagging.IsValidIncomingSecret(registered));
        Assert.Equal(Pod(oldCode).GetSigningSecret(), registered);
    }

    [Fact]
    public void GetSigningSecret_AfterTheGracePeriod_UsesTheNewCode()
    {
        AppCode newCode = Code("new", _now.AddMinutes(-10));
        AppCode oldCode = Code("old", _now.AddDays(-24));
        var updated = Pod(newCode, oldCode);

        _time.Advance(AppCodeRotation.SigningGracePeriod);

        Assert.Equal(Pod(newCode).GetSigningSecret(), updated.GetSigningSecret());
        Assert.True(updated.IsValidIncomingSecret(updated.GetSigningSecret()));
    }

    [Fact]
    public void IsValidIncomingSecret_AcceptsANewCodeInsideTheGracePeriod()
    {
        AppCode newCode = Code("new", _now.AddMinutes(-10));
        var updated = Pod(newCode, Code("old", _now.AddDays(-24)));

        Assert.True(updated.IsValidIncomingSecret(Pod(newCode).GetSigningSecret()));
    }

    [Fact]
    public void GetSigningSecret_OnlyExpiredCodes_Throws()
    {
        var pod = Pod(Code("expired", _now.AddDays(-63), expiresAt: _now.AddDays(-1)));

        Assert.Throws<PaymentException>(() => pod.GetSigningSecret());
    }
}
