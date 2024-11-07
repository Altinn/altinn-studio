using System.Collections.Frozen;
using System.Collections.Generic;
using Altinn.Studio.Designer.Controllers;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Controllers;

namespace Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Services.RequestSyncEvaluators;

public class EndpointNameSyncEvaluator : IRequestSyncEvaluator
{
    private const string RemoveControllerSuffix = "Controller";
    private readonly FrozenDictionary<string, FrozenSet<string>> _endpointsWhiteList = new Dictionary<string, FrozenSet<string>>
    {
        {
            nameof(RepositoryController).Replace(RemoveControllerSuffix, string.Empty),
            GenerateFrozenSet(
                nameof(RepositoryController.RepoStatus),
                nameof(RepositoryController.RepoDiff),
                nameof(RepositoryController.Pull),
                nameof(RepositoryController.ResetLocalRepository),
                nameof(RepositoryController.CommitAndPushRepo),
                nameof(RepositoryController.Commit),
                nameof(RepositoryController.Push)
            )
        },
        {
            nameof(AppDevelopmentController).Replace(RemoveControllerSuffix, string.Empty),
            GenerateFrozenSet(
                nameof(AppDevelopmentController.SaveLayoutSettings)
            )
        },
        {
            nameof(ApplicationMetadataController).Replace(RemoveControllerSuffix, string.Empty),
            GenerateFrozenSet(
                nameof(ApplicationMetadataController.DeleteMetadataForAttachment)
            )
        },
        {
            nameof(ProcessModelingController).Replace(RemoveControllerSuffix, string.Empty),
            GenerateFrozenSet(
                nameof(ProcessModelingController.AddDataTypeToApplicationMetadata),
                nameof(ProcessModelingController.DeleteDataTypeFromApplicationMetadata)
            )
        },
        {
            nameof(ResourceAdminController).Replace(RemoveControllerSuffix, string.Empty),
            GenerateFrozenSet(
                nameof(ResourceAdminController.UpdateResource)
            )
        }
    }.ToFrozenDictionary();

    private static FrozenSet<string> GenerateFrozenSet(params string[] actions)
    {
        return new HashSet<string>(actions).ToFrozenSet();
    }

    public bool IsEligibleForSynchronization(HttpContext httpContext)
    {
        var endpoint = httpContext.GetEndpoint();

        var controllerActionDescriptor = endpoint?.Metadata.GetMetadata<ControllerActionDescriptor>();

        if (controllerActionDescriptor == null)
        {
            return false;
        }

        string controllerName = controllerActionDescriptor.ControllerName;
        string actionName = controllerActionDescriptor.ActionName;

        if (_endpointsWhiteList.TryGetValue(controllerName, out FrozenSet<string> actionSet) && actionSet.Contains(actionName))
        {
            return true;
        }

        return false;
    }
}
