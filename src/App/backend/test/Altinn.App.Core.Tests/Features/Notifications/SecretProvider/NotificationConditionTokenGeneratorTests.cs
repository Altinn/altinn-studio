using Altinn.App.Core.Features.Notifications.SecretProvider;
using Altinn.App.Core.Infrastructure.Clients.Secrets;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

public class NotificationConditionTokenGeneratorTests
{
    private readonly Mock<INotificationConditionSecretProvider> _secretProviderMock = new(MockBehavior.Strict);

    private Fixture CreateFixture(bool withTelemetry = true)
    {
        var services = new ServiceCollection();
        services.AddSingleton(_secretProviderMock.Object);
        services.AddLogging(l => l.ClearProviders().AddProvider(NullLoggerProvider.Instance));

        if (withTelemetry)
            services.AddTelemetrySink();

        services.AddSingleton<INotificationConditionTokenGenerator, NotificationConditionTokenGenerator>();

        var sp = services.BuildStrictServiceProvider();
        return new(
            sp,
            (NotificationConditionTokenGenerator)sp.GetRequiredService<INotificationConditionTokenGenerator>(),
            sp.GetService<TelemetrySink>()
        );
    }

    [Fact]
    public async Task GenerateToken_RecordsTelemetry()
    {
        _secretProviderMock
            .Setup(x => x.GetSigningSecret())
            .Returns(
                new AppCode
                {
                    Id = "test-id",
                    Code = "test-secret-that-is-long-enough-for-hmac",
                    IssuedAt = DateTimeOffset.UtcNow,
                    ExpiresAt = DateTimeOffset.UtcNow.AddDays(62),
                }
            );
        using var fixture = CreateFixture(withTelemetry: true);

        fixture.Generator.GenerateToken(Guid.NewGuid(), fixture.TelemetrySink?.Object);

        await Verify(fixture.TelemetrySink?.GetSnapshot());
    }

    [Fact]
    public void DIContainer_Accepts_Missing_TelemetryClient()
    {
        using var fixture = CreateFixture(withTelemetry: false);
        Assert.NotNull(fixture.Generator);
    }

    private readonly record struct Fixture(
        IServiceProvider ServiceProvider,
        NotificationConditionTokenGenerator Generator,
        TelemetrySink? TelemetrySink
    ) : IDisposable
    {
        public void Dispose()
        {
            if (ServiceProvider is IDisposable sp)
                sp.Dispose();
        }
    }
}
