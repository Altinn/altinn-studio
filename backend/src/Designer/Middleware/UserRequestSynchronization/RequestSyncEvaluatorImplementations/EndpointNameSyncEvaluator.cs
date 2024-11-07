using System.Collections.Generic;
using Altinn.Studio.Designer.Controllers;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Controllers;

namespace Altinn.Studio.Designer.Middleware.UserRequestSynchronization.RequestSyncEvaluatorImplementations;

public class EndpointNameSyncEvaluator : IRequestSyncEvaluator
{
    private readonly Dictionary<string, List<string>> _endpointsWhiteList = new()
    {
        {  nameof(RepositoryController).Replace("Controller", string.Empty),
            [
                nameof(RepositoryController.RepoStatus),
                nameof(RepositoryController.RepoDiff),
                nameof(RepositoryController.Pull),
                nameof(RepositoryController.ResetLocalRepository),
                nameof(RepositoryController.CommitAndPushRepo),
                nameof(RepositoryController.Commit),
                nameof(RepositoryController.Push)
            ]
        },
        {
            nameof(AppDevelopmentController).Replace("Controller", string.Empty),
            [
                nameof(AppDevelopmentController.SaveLayoutSettings)
            ]
        },
        {
            nameof(ApplicationMetadataController).Replace("Controller", string.Empty),
            [
                nameof(ApplicationMetadataController.DeleteMetadataForAttachment)
            ]
        },
        {
            nameof(ProcessModelingController).Replace("Controller", string.Empty),
            [
                nameof(ProcessModelingController.AddDataTypeToApplicationMetadata),
                nameof(ProcessModelingController.DeleteDataTypeFromApplicationMetadata)
            ]
        }
    };

    public bool EvaluateSyncRequest(HttpContext httpContext)
    {
        var endpoint = httpContext.GetEndpoint();

        var controllerActionDescriptor = endpoint?.Metadata.GetMetadata<ControllerActionDescriptor>();

        if (controllerActionDescriptor == null)
        {
            return false;
        }

        string controllerName = controllerActionDescriptor.ControllerName;
        string actionName = controllerActionDescriptor.ActionName;

        if (_endpointsWhiteList.TryGetValue(controllerName, out List<string> actionList) && actionList.Contains(actionName))
        {
            return true;
        }

        return false;
    }
}
