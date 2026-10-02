using System;
using System.Collections.Frozen;
using System.Collections.Generic;
using System.IO;
using System.Xml;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Middleware.UserRequestSynchronization.Abstractions;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.Studio.Designer.Middleware.UserRequestSynchronization.RepoUserWide.RequestSyncEvaluators;

/// <summary>
/// Serializes v9 writes to files shared with process editing.
/// </summary>
/// <remarks>
/// Covers files in the process version and layout set folders that an edit can rename or delete.
/// Existing endpoint rules also serialize GET operations that change repositories.
/// </remarks>
public sealed class V9ProcessEditSyncEligibilityEvaluator(
    IRequestContextResolver<AltinnRepoEditingContext> requestContextResolver
) : IRepoUserSyncEligibilityEvaluator
{
    private static readonly FrozenSet<string> s_controllers = new[]
    {
        // process.bpmn and, through the edit's side effects, the other files.
        ControllerName(nameof(ProcessEditingController)),
        // BPMN, metadata, task folders, layouts, and policy through task ID change handlers.
        ControllerName(nameof(ProcessModelingController)),
        // Task folders, UI settings, layout-sets.json, and BPMN when a task folder is renamed.
        ControllerName(nameof(UiFoldersController)),
        // layout-sets.json, layouts, and layout set settings.
        ControllerName(nameof(AppDevelopmentController)),
        // The pages of a layout set: its layouts and Settings.json.
        ControllerName(nameof(LayoutController)),
        // applicationmetadata.json.
        ControllerName(nameof(ApplicationMetadataController)),
        // applicationmetadata.json (the app's name and description).
        ControllerName(nameof(ConfigController)),
        // Metadata data types and layout-sets.json when a data model is deleted.
        ControllerName(nameof(DatamodelsController)),
        // Saving texts also updates the app title in applicationmetadata.json.
#pragma warning disable CS0618 // The obsolete text endpoints are still in use.
        ControllerName(nameof(TextController)),
#pragma warning restore CS0618
        // layout-sets.json (task navigation).
        ControllerName(nameof(TaskNavigationController)),
    }.ToFrozenSet();

    private static readonly FrozenDictionary<string, FrozenSet<string>> s_actions = new Dictionary<
        string,
        FrozenSet<string>
    >
    {
        // Resource policy writes use a separate folder.
        [ControllerName(nameof(PolicyController))] = new[]
        {
            nameof(PolicyController.UpdateApplicationPolicy),
        }.ToFrozenSet(),
        // Repository replacement and commits must not run during a process edit.
        [ControllerName(nameof(RepositoryController))] = new[]
        {
            nameof(RepositoryController.CheckoutBranch),
            nameof(RepositoryController.DiscardLocalChanges),
            nameof(RepositoryController.Commit),
            nameof(RepositoryController.CommitAndPushRepo),
            nameof(RepositoryController.Push),
        }.ToFrozenSet(),
    }.ToFrozenDictionary();

    public bool IsEligibleForSynchronization(HttpContext httpContext)
    {
        if (!IsWriteRequest(httpContext.Request.Method) || !IsListedAction(httpContext))
        {
            return false;
        }
        return requestContextResolver.TryResolveContext(httpContext, out AltinnRepoEditingContext editingContext)
            && IsV9App(httpContext.RequestServices, editingContext);
    }

    private static bool IsWriteRequest(string method) =>
        HttpMethods.IsPost(method)
        || HttpMethods.IsPut(method)
        || HttpMethods.IsPatch(method)
        || HttpMethods.IsDelete(method);

    private static bool IsListedAction(HttpContext httpContext)
    {
        ControllerActionDescriptor? action = httpContext
            .GetEndpoint()
            ?.Metadata.GetMetadata<ControllerActionDescriptor>();
        if (action is null)
        {
            return false;
        }
        return s_controllers.Contains(action.ControllerName)
            || (
                s_actions.TryGetValue(action.ControllerName, out FrozenSet<string>? actions)
                && actions.Contains(action.ActionName)
            );
    }

    // Resolve transient services per request; this evaluator is a singleton.
    private static bool IsV9App(IServiceProvider services, AltinnRepoEditingContext editingContext)
    {
        string repositoryPath = services
            .GetRequiredService<IAltinnGitRepositoryFactory>()
            .GetRepositoryPath(editingContext.Org, editingContext.Repo, editingContext.Developer);
        if (!Directory.Exists(repositoryPath))
        {
            return false;
        }
        try
        {
            return services.GetRequiredService<IAppVersionService>().IsV9App(editingContext);
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException or XmlException)
        {
            // Take the lock when version detection fails so edits remain serialized.
            return true;
        }
    }

    private static string ControllerName(string controllerTypeName) => controllerTypeName[..^"Controller".Length];
}
