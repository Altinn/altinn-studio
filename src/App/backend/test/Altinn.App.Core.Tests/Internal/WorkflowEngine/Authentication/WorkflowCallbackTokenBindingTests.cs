using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Authentication;

public class WorkflowCallbackTokenBindingTests
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
            WorkflowCallbackTokenBinding.ActorHash(_actor),
            WorkflowCallbackTokenBinding.ActorHash(changed)
        );
    }

    [Fact]
    public void ActorHash_IgnoresLanguage()
    {
        Assert.Equal(
            WorkflowCallbackTokenBinding.ActorHash(_actor),
            WorkflowCallbackTokenBinding.ActorHash(_actor with { Language = "en" })
        );
    }

    [Fact]
    public void ActorHash_DistinguishesNullFromEmpty()
    {
        Assert.NotEqual(
            WorkflowCallbackTokenBinding.ActorHash(_actor with { OrgId = null }),
            WorkflowCallbackTokenBinding.ActorHash(_actor with { OrgId = "" })
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

        Assert.NotEqual(WorkflowCallbackTokenBinding.ActorHash(split), WorkflowCallbackTokenBinding.ActorHash(joined));
    }
}
