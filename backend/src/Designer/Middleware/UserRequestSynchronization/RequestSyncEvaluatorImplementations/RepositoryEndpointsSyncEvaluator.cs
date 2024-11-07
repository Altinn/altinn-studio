using System;
using System.Collections.Generic;
using Altinn.Studio.Designer.Controllers;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Controllers;

namespace Altinn.Studio.Designer.Middleware.UserRequestSynchronization.RequestSyncEvaluatorImplementations;

public class RepositoryEndpointsSyncEvaluator : IRequestSyncEvaluator
{
    private readonly string _controllerName = nameof(RepositoryController).Replace("Controller", string.Empty);
    private readonly List<string> _actionNamesWhiteList =
    [
        nameof(RepositoryController.RepoStatus),
        nameof(RepositoryController.RepoDiff),
        nameof(RepositoryController.Pull),
        nameof(RepositoryController.ResetLocalRepository),
        nameof(RepositoryController.CommitAndPushRepo),
        nameof(RepositoryController.Commit),
        nameof(RepositoryController.Push)
    ];

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
        if (controllerName.Equals(_controllerName, StringComparison.OrdinalIgnoreCase) && _actionNamesWhiteList.Contains(actionName))
        {
            return true;
        }

        return false;
    }
}
