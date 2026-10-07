using System.Text.Json;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Authentication;

public class WorkflowCallbackTokenGeneratorActorHashTests
{
    private static readonly Actor _actor = new()
    {
        UserId = 1337,
        OrgId = "ttd",
        AuthenticationLevel = 3,
        NationalIdentityNumber = "01017012345",
        SystemUserId = Guid.Parse("7a2c1c0e-3b1f-4d7e-9a57-0c8f2b1d4e6a"),
        SystemUserOwnerOrgNo = "991825827",
        SystemUserName = "Integration",
        Language = "nb",
    };

    // The shapes actors take in practice: each kind fills only its own fields.
    private static readonly Actor _user = new()
    {
        UserId = 1337,
        AuthenticationLevel = 2,
        NationalIdentityNumber = "01017012345",
        Language = "nb",
    };
    private static readonly Actor _systemUser = new()
    {
        SystemUserId = Guid.Parse("0b1c2d3e-4f50-4617-8293-a4b5c6d7e8f9"),
        SystemUserOwnerOrgNo = "991825827",
        SystemUserName = "Integrasjon for Tønsberg",
        Language = "nb",
    };
    private static readonly Actor _serviceOwner = new() { OrgId = "ttd", Language = "nb" };

    public static TheoryData<Actor> RealisticActors => [_user, _systemUser, _serviceOwner];

    public static TheoryData<Actor> EachIdentityFieldChanged =>
        [
            _actor with
            {
                UserId = 1338,
            },
            _actor with
            {
                UserId = null,
            },
            _actor with
            {
                OrgId = "skd",
            },
            _actor with
            {
                AuthenticationLevel = 2,
            },
            _actor with
            {
                NationalIdentityNumber = "01017054321",
            },
            _actor with
            {
                SystemUserId = Guid.NewGuid(),
            },
            _actor with
            {
                SystemUserOwnerOrgNo = "310000000",
            },
            _actor with
            {
                SystemUserName = "Other",
            },
        ];

    [Theory]
    [MemberData(nameof(EachIdentityFieldChanged))]
    public void ActorHash_ChangesWithEveryIdentityField(Actor changed)
    {
        Assert.NotEqual(
            WorkflowCallbackTokenGenerator.ActorHash(_actor),
            WorkflowCallbackTokenGenerator.ActorHash(changed)
        );
    }

    [Fact]
    public void ActorHash_IgnoresLanguage()
    {
        Assert.Equal(
            WorkflowCallbackTokenGenerator.ActorHash(_actor),
            WorkflowCallbackTokenGenerator.ActorHash(_actor with { Language = "en" })
        );
    }

    [Fact]
    public void ActorHash_DistinguishesNullFromEmpty()
    {
        Assert.NotEqual(
            WorkflowCallbackTokenGenerator.ActorHash(_actor with { OrgId = null }),
            WorkflowCallbackTokenGenerator.ActorHash(_actor with { OrgId = "" })
        );
    }

    [Fact]
    public void ActorHash_DoesNotLetAValueSpillIntoTheNextField()
    {
        // A value carrying a separator must not reproduce two neighbouring fields' encoding.
        var split = _actor with
        {
            SystemUserOwnerOrgNo = "a",
            SystemUserName = "b",
        };
        var joined = _actor with { SystemUserOwnerOrgNo = "a\",\"b", SystemUserName = null };

        Assert.NotEqual(
            WorkflowCallbackTokenGenerator.ActorHash(split),
            WorkflowCallbackTokenGenerator.ActorHash(joined)
        );
    }

    [Theory]
    [MemberData(nameof(RealisticActors))]
    public void ActorHash_SurvivesTheWireRoundTripOfASparseActor(Actor actor)
    {
        // Null fields are omitted on the way out and read back as null, as they are between the app and the engine.
        Actor echoed =
            JsonSerializer.Deserialize<Actor>(
                JsonSerializer.Serialize(actor),
                new JsonSerializerOptions(JsonSerializerDefaults.Web)
            ) ?? throw new InvalidOperationException("The actor did not deserialize.");

        Assert.Equal(WorkflowCallbackTokenGenerator.ActorHash(actor), WorkflowCallbackTokenGenerator.ActorHash(echoed));
    }

    [Fact]
    public void ActorHash_TellsTheRealisticActorsApart()
    {
        Assert.Distinct(new[] { _user, _systemUser, _serviceOwner }.Select(WorkflowCallbackTokenGenerator.ActorHash));
    }

    [Fact]
    public void ActorHash_TellsTheSameValueInDifferentFieldsApart()
    {
        // With nearly every field null, only a field's position separates these.
        Assert.NotEqual(
            WorkflowCallbackTokenGenerator.ActorHash(new Actor { UserId = 5 }),
            WorkflowCallbackTokenGenerator.ActorHash(new Actor { AuthenticationLevel = 5 })
        );
        Assert.NotEqual(
            WorkflowCallbackTokenGenerator.ActorHash(new Actor { OrgId = "991825827" }),
            WorkflowCallbackTokenGenerator.ActorHash(new Actor { SystemUserOwnerOrgNo = "991825827" })
        );
    }
}
