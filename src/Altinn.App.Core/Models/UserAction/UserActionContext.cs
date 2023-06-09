using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Models.UserAction;

public class UserActionContext
{
    public UserActionContext(Instance instance, int userId)
    {
        Instance = instance;
        UserId = userId;
    }

    public Instance Instance { get; }
    
    public int UserId { get; }
}