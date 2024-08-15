using System.Diagnostics;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Helpers.DataModel;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Internal.Expressions;

/// <summary>
/// Utility class for collecting all the services from DI that are needed to initialize <see cref="LayoutEvaluatorState" />
/// </summary>
public class LayoutEvaluatorStateInitializer : ILayoutEvaluatorStateInitializer
{
    // Dependency injection properties (set in ctor)
    private readonly IAppResources _appResources;
    private readonly FrontEndSettings _frontEndSettings;
    private readonly ICachedFormDataAccessor _dataAccessor;

    /// <summary>
    /// Constructor with services from dependency injection
    /// </summary>
    public LayoutEvaluatorStateInitializer(
        IAppResources appResources,
        IOptions<FrontEndSettings> frontEndSettings,
        ICachedFormDataAccessor dataAccessor
    )
    {
        _appResources = appResources;
        _dataAccessor = dataAccessor;
        _frontEndSettings = frontEndSettings.Value;
    }

    /// <summary>
    /// Initialize LayoutEvaluatorState with given Instance, data object and layoutSetId
    /// </summary>
    [Obsolete("Use the overload with ILayoutEvaluatorStateInitializer instead")]
    public Task<LayoutEvaluatorState> Init(
        Instance instance,
        object data,
        string? layoutSetId,
        string? gatewayAction = null
    )
    {
        var layouts = _appResources.GetLayoutModel(layoutSetId);
        var dataElement = instance.Data.Find(d => d.DataType == layouts.DefaultDataType.Id);
        Debug.Assert(dataElement is not null);
        return Task.FromResult(
            new LayoutEvaluatorState(
                new DataModel([KeyValuePair.Create(dataElement, data)]),
                layouts,
                _frontEndSettings,
                instance,
                gatewayAction
            )
        );
    }

    /// <inheritdoc />
    public async Task<LayoutEvaluatorState> Init(
        Instance instance,
        string taskId,
        string? gatewayAction = null,
        string? language = null
    )
    {
        var layouts = _appResources.GetLayoutModelForTask(taskId);

        var defaultDataTypeId = layouts.DefaultDataType.Id;
        var defaultDataElement = instance.Data.Find(d => d.DataType == defaultDataTypeId);
        if (defaultDataElement is null)
        {
            throw new InvalidOperationException($"No data element found for data type {defaultDataTypeId}");
        }

        var dataTasks = new List<Task<KeyValuePair<DataElement, object>>>();
        foreach (var dataType in layouts.GetReferencedDataTypeIds())
        {
            dataTasks.AddRange(
                instance
                    .Data.Where(dataElement => dataElement.DataType == dataType)
                    .Select(async dataElement =>
                        KeyValuePair.Create(dataElement, await _dataAccessor.Get(instance, dataElement))
                    )
            );
        }

        var extraModels = await Task.WhenAll(dataTasks);

        return new LayoutEvaluatorState(
            new DataModel(extraModels),
            layouts,
            _frontEndSettings,
            instance,
            gatewayAction,
            language
        );
    }
}
