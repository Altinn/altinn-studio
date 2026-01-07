using System.Text.Json;
using Altinn.App.Core.Features.Bootstrap.Models;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.Bootstrap;

/// <summary>
/// Service responsible for aggregating all initial data required for application bootstrap.
/// </summary>
internal sealed class BootstrapInstanceService(IAppResources appResources, IInstanceClient instanceClient)
    : IBootstrapInstanceService
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    /// <inheritdoc />
    public async Task<BootstrapInstanceResponse> GetInitialData(
        string org,
        string app,
        string instanceId,
        int partyId,
        string? language = null,
        CancellationToken cancellationToken = default
    )
    {
        // Get instance if instanceId is provided
        var instance = !string.IsNullOrEmpty(instanceId) ? await GetInstance(org, app, instanceId) : null;

        var taskId = instance?.Process?.CurrentTask?.ElementId;

        // Start tasks in parallel
        var footerLayoutTask = GetFooterLayout();

        // Get layout data (synchronous operations)
        var layoutSets = GetLayoutSets();
        var layout = GetLayoutForTask(taskId);

        // Await async task
        var footerLayout = await footerLayoutTask;

        // Build response immutably
        return new BootstrapInstanceResponse
        {
            Instance = instance,
            LayoutSets = layoutSets,
            Layout = layout,
            FooterLayout = footerLayout,
        };
    }

    private async Task<Instance?> GetInstance(string org, string app, string instanceId)
    {
        var instanceOwnerPartyId = ParseInstanceOwnerPartyId(instanceId);
        var instanceGuid = ParseInstanceGuid(instanceId);

        if (!instanceOwnerPartyId.HasValue || !instanceGuid.HasValue)
        {
            return null;
        }

        return await instanceClient.GetInstance(app, org, instanceOwnerPartyId.Value, instanceGuid.Value);
    }

    private LayoutSets? GetLayoutSets()
    {
        try
        {
            var layoutSetsJson = appResources.GetLayoutSets();
            return string.IsNullOrEmpty(layoutSetsJson)
                ? null
                : JsonSerializer.Deserialize<LayoutSets>(layoutSetsJson, _jsonSerializerOptions);
        }
        catch
        {
            return null;
        }
    }

    private object? GetLayoutSettings()
    {
        try
        {
            var layoutSettingsJson = appResources.GetLayoutSettingsString();
            return string.IsNullOrEmpty(layoutSettingsJson)
                ? null
                : JsonSerializer.Deserialize<object>(layoutSettingsJson, _jsonSerializerOptions);
        }
        catch
        {
            return null;
        }
    }

    private object? GetLayoutForTask(string? taskId)
    {
        if (string.IsNullOrEmpty(taskId))
        {
            return null;
        }

        try
        {
            var currentLayoutSet = appResources.GetLayoutSetForTask(taskId);
            if (currentLayoutSet == null)
            {
                return null;
            }

            var layoutJson = appResources.GetLayoutsForSet(currentLayoutSet.Id);
            return string.IsNullOrEmpty(layoutJson)
                ? null
                : JsonSerializer.Deserialize<object>(layoutJson, _jsonSerializerOptions);
        }
        catch
        {
            return null;
        }
    }

    private async Task<object?> GetFooterLayout()
    {
        try
        {
            var footerJson = await appResources.GetFooter();
            return string.IsNullOrEmpty(footerJson)
                ? null
                : JsonSerializer.Deserialize<object>(footerJson, _jsonSerializerOptions);
        }
        catch
        {
            return null;
        }
    }

    private static int? ParseInstanceOwnerPartyId(string instanceId)
    {
        var parts = instanceId.Split('/');
        return parts.Length >= 1 && int.TryParse(parts[0], out var partyId) ? partyId : null;
    }

    private static Guid? ParseInstanceGuid(string instanceId)
    {
        var parts = instanceId.Split('/');
        return parts.Length >= 2 && Guid.TryParse(parts[1], out var guid) ? guid : null;
    }
}
