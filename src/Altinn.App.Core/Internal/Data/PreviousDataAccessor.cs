using System.Collections.Concurrent;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Data;

internal class PreviousDataAccessor : IInstanceDataAccessor
{
    private readonly IInstanceDataAccessor _dataAccessor;
    private readonly IAppResources _appResources;
    private readonly ModelSerializationService _modelSerializationService;
    private readonly FrontEndSettings _frontEndSettings;
    private readonly ITranslationService _translationService;
    private readonly Telemetry? _telemetry;

    private readonly ConcurrentDictionary<DataElementIdentifier, Task<IFormDataWrapper>> _previousDataCache = new();

    public PreviousDataAccessor(
        IInstanceDataAccessor dataAccessor,
        IAppResources appResources,
        ITranslationService translationService,
        ModelSerializationService modelSerializationService,
        FrontEndSettings frontEndSettings,
        Telemetry? telemetry
    )
    {
        _dataAccessor = dataAccessor;
        _appResources = appResources;
        _translationService = translationService;
        _modelSerializationService = modelSerializationService;
        _frontEndSettings = frontEndSettings;
        _telemetry = telemetry;
    }

    public Instance Instance => _dataAccessor.Instance;

    public IReadOnlyCollection<DataType> DataTypes => _dataAccessor.DataTypes;

    public string? TaskId => _dataAccessor.TaskId;
    public string? Language => _dataAccessor.Language;

    public IReadOnlyDictionary<DataType, StorageAuthenticationMethod> AuthenticationMethodOverrides =>
        throw new NotImplementedException();

    public async Task<object> GetFormData(DataElementIdentifier dataElementIdentifier)
    {
        return (await GetFormDataWrapper(dataElementIdentifier).ConfigureAwait(false)).BackingData<object>();
    }

    public async Task<IFormDataWrapper> GetFormDataWrapper(DataElementIdentifier dataElementIdentifier)
    {
        var data = await _previousDataCache
            .GetOrAdd(
                dataElementIdentifier,
                async id =>
                {
                    var dataType = this.GetDataType(id);
                    if (dataType.AppLogic?.ClassRef is null)
                    {
                        throw new InvalidOperationException(
                            $"Data element {id.Id} is of data type {dataType.Id} which doesn't have app logic in application metadata and cant be used as form data"
                        );
                    }
                    var dataElement = GetDataElement(id);
                    var binaryData = await _dataAccessor.GetBinaryData(id).ConfigureAwait(false);

                    return FormDataWrapperFactory.Create(
                        _modelSerializationService.DeserializeFromStorage(binaryData.Span, dataType, dataElement)
                    );
                }
            )
            .ConfigureAwait(false);

        return data.Copy();
    }

    public IInstanceDataAccessor GetCleanAccessor(RowRemovalOption rowRemovalOption = RowRemovalOption.SetToNull)
    {
        return new CleanInstanceDataAccessor(
            this,
            _appResources,
            _translationService,
            _frontEndSettings,
            rowRemovalOption,
            _telemetry
        );
    }

    public IInstanceDataAccessor GetPreviousDataAccessor()
    {
        return this;
    }

    public LayoutEvaluatorState? GetLayoutEvaluatorState()
    {
        throw new NotImplementedException(
            "GetLayoutEvaluatorState is not implemented in PreviousDataAccessor, because LayoutEvaluatorState will be deprecated."
        );
    }

    public async Task<ReadOnlyMemory<byte>> GetBinaryData(DataElementIdentifier dataElementIdentifier)
    {
        return await _dataAccessor.GetBinaryData(dataElementIdentifier).ConfigureAwait(false);
    }

    public DataElement GetDataElement(DataElementIdentifier dataElementIdentifier)
    {
        return _dataAccessor.GetDataElement(dataElementIdentifier);
    }

    public void OverrideAuthenticationMethod(DataType dataType, StorageAuthenticationMethod method)
    {
        _dataAccessor.OverrideAuthenticationMethod(dataType, method);
    }
}
