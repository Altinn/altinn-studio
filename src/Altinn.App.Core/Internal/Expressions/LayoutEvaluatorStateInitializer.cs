using System.Diagnostics;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Layout;
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
    private readonly IAppMetadata _appMetadata;
    private readonly FrontEndSettings _frontEndSettings;

    /// <summary>
    /// Constructor with services from dependency injection
    /// </summary>
    public LayoutEvaluatorStateInitializer(
        IAppResources appResources,
        IAppMetadata appMetadata,
        IOptions<FrontEndSettings> frontEndSettings
    )
    {
        _appResources = appResources;
        _appMetadata = appMetadata;
        _frontEndSettings = frontEndSettings.Value;
    }

    /// <summary>
    /// Helper class to keep compatibility with old interface
    /// delete when <see cref="LayoutEvaluatorStateInitializer.Init(Altinn.Platform.Storage.Interface.Models.Instance,object,string?,string?)"/>
    /// is removed
    /// </summary>
    private sealed class SingleDataElementAccessor : IInstanceDataAccessor
    {
        private readonly DataElement _dataElement;
        private readonly object _data;

        public SingleDataElementAccessor(Instance instance, DataElement dataElement, object data)
        {
            Instance = instance;
            _dataElement = dataElement;
            _data = data;
        }

        public Instance Instance { get; }

        public Task<object> GetFormData(DataElementId dataElementId)
        {
            if (dataElementId != _dataElement)
            {
                return Task.FromException<object>(
                    new InvalidOperationException(
                        "Use the new ILayoutEvaluatorStateInitializer interface to support multiple data models and subforms"
                    )
                );
            }
            return Task.FromResult(_data);
        }

        public Task<ReadOnlyMemory<byte>> GetBinaryData(DataElementId dataElementId)
        {
            return Task.FromException<ReadOnlyMemory<byte>>(new NotImplementedException());
        }

        public DataElement GetDataElement(DataElementId dataElementId)
        {
            if (dataElementId != _dataElement)
            {
                throw new InvalidOperationException(
                    "Use the new ILayoutEvaluatorStateInitializer interface to support multiple data models and subforms"
                );
            }
            return _dataElement;
        }
    }

    /// <summary>
    /// Initialize LayoutEvaluatorState with given Instance, data object and layoutSetId
    /// </summary>
    [Obsolete("Use the overload with ILayoutEvaluatorStateInitializer instead")]
    public async Task<LayoutEvaluatorState> Init(
        Instance instance,
        object data,
        string? layoutSetId,
        string? gatewayAction = null
    )
    {
        var layouts = _appResources.GetLayoutModel(layoutSetId);
        var dataElement = instance.Data.Find(d => d.DataType == layouts.DefaultDataType.Id);
        Debug.Assert(dataElement is not null);
        var appMetadata = await _appMetadata.GetApplicationMetadata();
        var dataAccessor = new SingleDataElementAccessor(instance, dataElement, data);
        return new LayoutEvaluatorState(dataAccessor, layouts, _frontEndSettings, appMetadata, gatewayAction);
    }

    /// <inheritdoc />
    public async Task<LayoutEvaluatorState> Init(
        IInstanceDataAccessor dataAccessor,
        string? taskId,
        string? gatewayAction = null,
        string? language = null
    )
    {
        LayoutModel? layouts = taskId is not null ? _appResources.GetLayoutModelForTask(taskId) : null;
        var appMetadata = await _appMetadata.GetApplicationMetadata();

        return new LayoutEvaluatorState(dataAccessor, layouts, _frontEndSettings, appMetadata, gatewayAction, language);
    }
}
