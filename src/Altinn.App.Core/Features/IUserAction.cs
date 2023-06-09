using Altinn.App.Core.Models.UserAction;

namespace Altinn.App.Core.Features;

public interface IUserAction
{
    string Id { get; }
        
    Task<bool> HandleAction(UserActionContext context);
}