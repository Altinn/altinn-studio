using Altinn.Platform.Storage.Authorization;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Platform.Storage.Extensions;

public static class DataTypeExtensions
{
    public static async Task<bool> CanRead(
        this DataType dataType,
        IAuthorization authorizationService,
        Instance instance,
        string task = null
    )
    {
        if (string.IsNullOrWhiteSpace(dataType.ActionRequiredToRead))
        {
            return true;
        }

        return await authorizationService.AuthorizeInstanceAction(
            instance,
            dataType.ActionRequiredToRead,
            task ?? instance.Process?.CurrentTask?.ElementId
        );
    }

    public static async Task<bool> CanWrite(
        this DataType dataType,
        IAuthorization authorizationService,
        Instance instance,
        string task = null
    )
    {
        if (string.IsNullOrWhiteSpace(dataType.ActionRequiredToWrite))
        {
            return true;
        }

        return await authorizationService.AuthorizeInstanceAction(
            instance,
            dataType.ActionRequiredToWrite,
            task ?? instance.Process?.CurrentTask?.ElementId
        );
    }
}
