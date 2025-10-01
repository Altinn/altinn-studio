using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Layout;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Data;

internal class CleanInstanceDataAccessor : IInstanceDataAccessor
{
    private readonly IInstanceDataAccessor _dataAccessor;
    private readonly string? _taskId;
    private readonly IAppResources _appResources;
    private readonly FrontEndSettings _frontEndSettings;
    private readonly RowRemovalOption _rowRemovalOption;
    private readonly string? _language;
    private readonly ITranslationService _translationService;
    private readonly Telemetry? _telemetry;

    public CleanInstanceDataAccessor(
        IInstanceDataAccessor dataAccessor,
        string? taskId,
        IAppResources appResources,
        ITranslationService translationService,
        FrontEndSettings frontEndSettings,
        RowRemovalOption rowRemovalOption,
        string? language,
        Telemetry? telemetry
    )
    {
        _dataAccessor = dataAccessor;
        _taskId = taskId;
        _appResources = appResources;
        _frontEndSettings = frontEndSettings;
        _rowRemovalOption = rowRemovalOption;
        _language = language;
        _telemetry = telemetry;
        _translationService = translationService;

        LayoutModel? layouts = taskId is not null ? appResources.GetLayoutModelForTask(taskId) : null;
        if (layouts is null)
        {
            _hiddenFieldsTask = new(() => Task.FromResult(new List<DataReference>()));
        }
        else
        {
            var state = new LayoutEvaluatorState(
                dataAccessor,
                layouts,
                translationService,
                frontEndSettings,
                gatewayAction: null,
                language
            );
            _hiddenFieldsTask = new(() =>
            {
                using var activity = telemetry?.StartRemoveHiddenDataForValidation();
                return LayoutEvaluator.GetHiddenFieldsForRemoval(state, evaluateRemoveWhenHidden: false);
            });
        }
    }

    private readonly DataElementCache<IFormDataWrapper> _cleanCache = new();

    private readonly Lazy<Task<List<DataReference>>> _hiddenFieldsTask;

    public Instance Instance => _dataAccessor.Instance;

    public IReadOnlyCollection<DataType> DataTypes => _dataAccessor.DataTypes;

    public IReadOnlyDictionary<DataType, StorageAuthenticationMethod> AuthenticationMethodOverrides =>
        _dataAccessor.AuthenticationMethodOverrides;

    public async Task<object> GetFormData(DataElementIdentifier dataElementIdentifier)
    {
        return (await GetFormDataWrapper(dataElementIdentifier)).BackingData<object>();
    }

    public async Task<IFormDataWrapper> GetFormDataWrapper(DataElementIdentifier dataElementIdentifier)
    {
        var dataWrapper = await _cleanCache.GetOrCreate(
            dataElementIdentifier,
            async () =>
            {
                var data = await _dataAccessor.GetFormDataWrapper(dataElementIdentifier).ConfigureAwait(false);
                var hiddenFields = await _hiddenFieldsTask.Value.ConfigureAwait(false);
                return CleanModel(data.Copy(), dataElementIdentifier, hiddenFields, _rowRemovalOption);
            }
        );

        return dataWrapper.Copy();
    }

    private static IFormDataWrapper CleanModel(
        IFormDataWrapper data,
        DataElementIdentifier dataElementIdentifier,
        List<DataReference> hiddenFields,
        RowRemovalOption rowRemovalOption
    )
    {
        foreach (var dataReference in hiddenFields)
        {
            if (dataReference.DataElementIdentifier != dataElementIdentifier)
            {
                continue;
            }

            // Note that the paths for lists is in reverse order from GetHiddenFieldsForRemoval, so we can remove them here in order
            data.RemoveField(dataReference.Field, rowRemovalOption);
        }

        return data;
    }

    public IInstanceDataAccessor GetCleanAccessor(RowRemovalOption rowRemovalOption = RowRemovalOption.SetToNull)
    {
        if (rowRemovalOption == _rowRemovalOption)
        {
            return this;
        }
        return new CleanInstanceDataAccessor(
            _dataAccessor,
            _taskId,
            _appResources,
            _translationService,
            _frontEndSettings,
            rowRemovalOption,
            _language,
            _telemetry
        );
    }

    public IInstanceDataAccessor GetPreviousDataAccessor()
    {
        return _dataAccessor.GetPreviousDataAccessor();
    }

    public async Task<ReadOnlyMemory<byte>> GetBinaryData(DataElementIdentifier dataElementIdentifier)
    {
        return await _dataAccessor.GetBinaryData(dataElementIdentifier);
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
