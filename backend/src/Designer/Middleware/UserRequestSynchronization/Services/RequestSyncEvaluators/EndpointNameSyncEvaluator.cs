using System.Collections.Frozen;
using System.Collections.Generic;
using Altinn.Studio.Designer.Controllers;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Controllers;

namespace Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Services.RequestSyncEvaluators;

/// <summary>
/// Evaluates if a request is eligible for synchronization based on the endpoint name.
/// Contains a whitelist of endpoints that are eligible for synchronization.
/// </summary>
public class EndpointNameSyncEvaluator : IRequestSyncEvaluator
{
    private const string RemoveControllerSuffix = "Controller";
    private static string TrimmedControllerName(string controllerName) => controllerName.Replace(RemoveControllerSuffix, string.Empty);
    private readonly FrozenDictionary<string, FrozenSet<string>> _endpointsWhiteList = new Dictionary<string, FrozenSet<string>>
    {
        {
            TrimmedControllerName(nameof(RepositoryController)),
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
            TrimmedControllerName(nameof(AppDevelopmentController)),
            GenerateFrozenSet(
                nameof(AppDevelopmentController.SaveFormLayout),
                nameof(AppDevelopmentController.UpdateFormLayoutName),
                nameof(AppDevelopmentController.SaveLayoutSettings),
                nameof(AppDevelopmentController.SaveRuleHandler),
                nameof(AppDevelopmentController.SaveRuleConfig),
                nameof(AppDevelopmentController.AddLayoutSet),
                nameof(AppDevelopmentController.UpdateLayoutSetName),
                nameof(AppDevelopmentController.DeleteFormLayout),
                nameof(AppDevelopmentController.DeleteLayoutSet)
            )
        },
        {
            TrimmedControllerName(nameof(ApplicationMetadataController)),
            GenerateFrozenSet(
                nameof(ApplicationMetadataController.DeleteMetadataForAttachment)
            )
        },
        {
            TrimmedControllerName( nameof(ProcessModelingController)),
            GenerateFrozenSet(
                nameof(ProcessModelingController.AddDataTypeToApplicationMetadata),
                nameof(ProcessModelingController.DeleteDataTypeFromApplicationMetadata),
                nameof(ProcessModelingController.UpsertProcessDefinitionAndNotify),
                nameof(ProcessModelingController.ProcessDataTypesChangedNotify),
                nameof(ProcessModelingController.SaveProcessDefinitionFromTemplate)
            )
        },
        {
            TrimmedControllerName( nameof(ResourceAdminController)),
            GenerateFrozenSet(
                nameof(ResourceAdminController.UpdateResource)
            )
        },
        {
            TrimmedControllerName(nameof(ReleasesController)),
            GenerateFrozenSet(
                nameof(ReleasesController.Create)
            )
        },
        {
            TrimmedControllerName(nameof(DeploymentsController)),
            GenerateFrozenSet(
                nameof(DeploymentsController.Create)
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
