using Altinn.App.Core.Constants;
using Altinn.App.Core.Infrastructure.Clients.Secrets;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using Microsoft.IdentityModel.JsonWebTokens;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Authentication;

/// <summary>
/// A rotation seen from two pods of one app: one has read the rotated secret, the other has not yet. A callback
/// signed on one pod can land on the other.
/// </summary>
public class WorkflowCallbackCodeRotationTests
{
    private const string CommandKey = "mutate";
    private const string Payload = """{"instance":{"id":"501337/abc"}}""";

    private static readonly Actor _actor = new() { UserId = 1337 };

    private static readonly WorkflowRequest[] _workflows =
    [
        new()
        {
            OperationId = "workflow",
            Steps =
            [
                new()
                {
                    OperationId = "step",
                    Command = CommandDefinition.Create("app", new AppCommandData { CommandKey = CommandKey }),
                },
            ],
        },
    ];

    // Starts at the wall clock: the token handler stamps nbf from it.
    private readonly FakeTimeProvider _time = new(DateTimeOffset.UtcNow);

    private AppCode NewCode => Code("new", _rotatedAt);
    private AppCode OldCode => Code("old", _rotatedAt.AddDays(-24));

    private readonly DateTimeOffset _rotatedAt;

    public WorkflowCallbackCodeRotationTests()
    {
        _rotatedAt = _time.GetUtcNow().AddMinutes(-1);
    }

    private static AppCode Code(string id, DateTimeOffset issuedAt) =>
        new()
        {
            Id = id,
            Code = $"{id}-code-that-is-long-enough-for-hmac",
            IssuedAt = issuedAt,
            ExpiresAt = issuedAt.AddDays(365),
        };

    private WorkflowCallbackSecretProvider Pod(params AppCode[] codes) =>
        new(Options(new AppCodesSettings { WorkflowEngineCallback = [.. codes] }), _time);

    private static IOptionsMonitor<AppCodesSettings> Options(AppCodesSettings settings)
    {
        var monitor = new Mock<IOptionsMonitor<AppCodesSettings>>();
        monitor.Setup(m => m.CurrentValue).Returns(settings);
        return monitor.Object;
    }

    private string Token(IWorkflowCallbackSecretProvider pod, Guid instanceGuid) =>
        new WorkflowCallbackTokenGenerator(pod, _time).GenerateToken(instanceGuid, _actor, _workflows);

    private Task<ValidatedWorkflowCallbackToken?> Validate(
        IWorkflowCallbackSecretProvider pod,
        string token,
        Guid instanceGuid
    ) =>
        new WorkflowCallbackTokenValidator(
            pod,
            NullLogger<WorkflowCallbackTokenValidator>.Instance,
            _time
        ).ValidateToken(token, instanceGuid, CommandKey);

    private static string SecretIdOf(string token) =>
        new JsonWebTokenHandler().ReadJsonWebToken(token).GetClaim(JwtClaimTypes.AppCode.SecretId).Value;

    [Fact]
    public async Task InsideTheGracePeriod_APodThatHasNotReadTheNewCode_AcceptsTokenAndStateFromOneThatHas()
    {
        var updated = Pod(NewCode, OldCode);
        var lagging = Pod(OldCode);
        var instanceGuid = Guid.NewGuid();

        string token = Token(updated, instanceGuid);
        string state = new WorkflowStateSigner(updated, _time).Sign(Payload, SigningDomain.CallbackState);

        Assert.Equal("old", SecretIdOf(token));
        Assert.NotNull(await Validate(lagging, token, instanceGuid));
        Assert.Equal(Payload, new WorkflowStateSigner(lagging, _time).Verify(state, SigningDomain.CallbackState));
    }

    [Fact]
    public async Task InsideTheGracePeriod_APodThatHasReadTheNewCode_AcceptsTokenAndStateSignedWithIt()
    {
        var updated = Pod(NewCode, OldCode);
        var signsWithNewCode = new Mock<IWorkflowCallbackSecretProvider>(MockBehavior.Strict);
        signsWithNewCode.Setup(p => p.GetSigningSecret()).Returns(NewCode);
        var instanceGuid = Guid.NewGuid();

        string token = Token(signsWithNewCode.Object, instanceGuid);
        string state = new WorkflowStateSigner(signsWithNewCode.Object, _time).Sign(
            Payload,
            SigningDomain.CallbackState
        );

        Assert.Equal("new", SecretIdOf(token));
        Assert.NotNull(await Validate(updated, token, instanceGuid));
        Assert.Equal(Payload, new WorkflowStateSigner(updated, _time).Verify(state, SigningDomain.CallbackState));
    }

    [Fact]
    public async Task AfterTheGracePeriod_APodSignsWithTheNewCode()
    {
        var updated = Pod(NewCode, OldCode);
        var instanceGuid = Guid.NewGuid();

        _time.SetUtcNow(_rotatedAt + AppCodeRotation.SigningGracePeriod);
        string token = Token(updated, instanceGuid);

        Assert.Equal("new", SecretIdOf(token));
        Assert.NotNull(await Validate(updated, token, instanceGuid));
    }

    [Fact]
    public void InsideTheGracePeriod_TheTokenExpiresWithTheOldCode()
    {
        var updated = Pod(NewCode, OldCode);

        string token = Token(updated, Guid.NewGuid());

        // JWT exp has second precision.
        DateTime expires = new JsonWebTokenHandler().ReadJsonWebToken(token).ValidTo;
        Assert.True(Math.Abs((expires - OldCode.ExpiresAt.UtcDateTime).TotalSeconds) < 1);
    }
}
