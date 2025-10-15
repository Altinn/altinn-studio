using System.Collections.Frozen;
using System.Collections.Generic;
using Altinn.Studio.Designer.Controllers;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Controllers;

namespace Altinn.Studio.Designer.Middleware.UserRequestSynchronization.OrgWide.RequestSyncEvaluators;

/// <summary>
/// Evaluates if a request is eligible for synchronization based on the endpoint name.
/// Contains a whitelist of endpoints that are eligible for synchronization.
/// </summary>
public class EndpointNameSyncEligibilityEvaluator : IOrgWideSyncEligibilityEvaluator
{
    private const string RemoveControllerSuffix = "Controller";
    private static string TrimmedControllerName(string controllerName) => controllerName.Replace(RemoveControllerSuffix, string.Empty);
    private readonly FrozenDictionary<string, FrozenSet<string>> _endpointsWhiteList = new Dictionary<string, FrozenSet<string>>
    {
        {
            TrimmedControllerName(nameof(DeploymentsController)),
            GenerateFrozenSet(
                nameof(DeploymentsController.Create),
                nameof(DeploymentsController.Undeploy)
            )
        }
    }.ToFrozenDictionary();

    private static FrozenSet<string> GenerateFrozenSet(params string[] actions)
    {
        return actions.ToFrozenSet();
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
