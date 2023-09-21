using Altinn.App.Core.Configuration;
using Altinn.App.Core.Helpers.DataModel;
using Altinn.App.Core.Internal.App;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Internal.Expressions;

/// <summary>
/// Utility class for collecting all the services from DI that are needed to initialize <see cref="LayoutEvaluatorState" />
/// </summary>
public class LayoutEvaluatorStateInitializer
{
    // Dependency injection properties (set in ctor)
    private readonly IAppResources _appResources;
    private readonly FrontEndSettings _frontEndSettings;

    /// <summary>
    /// Constructor with services from dependency injection
    /// </summary>
    public LayoutEvaluatorStateInitializer(IAppResources appResources, IOptions<FrontEndSettings> frontEndSettings)
    {
        _appResources = appResources;
        _frontEndSettings = frontEndSettings.Value;
    }

    /// <summary>
    /// Initialize LayoutEvaluatorState with given Instance, data object and layoutSetId
    /// </summary>
    public Task<LayoutEvaluatorState> Init(Instance instance, object data, string? layoutSetId, string? gatewayAction = null)
    {
        var layouts = _appResources.GetLayoutModel(layoutSetId);
        return Task.FromResult(new LayoutEvaluatorState(new DataModel(data), layouts, _frontEndSettings, instance, gatewayAction));
    }
}
