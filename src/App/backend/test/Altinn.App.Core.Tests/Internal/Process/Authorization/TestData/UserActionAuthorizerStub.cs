#nullable disable
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Action;

namespace Altinn.App.Core.Tests.Internal.Process.Action.TestData;

public class UserActionAuthorizerStub : IUserActionAuthorizer
{
    public Task<bool> AuthorizeAction(UserActionAuthorizerContext context)
    {
        return Task.FromResult(true);
    }
}
