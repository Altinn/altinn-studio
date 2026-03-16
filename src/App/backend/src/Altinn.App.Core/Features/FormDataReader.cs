using System.Text.Json;
using Altinn.App.Core.Helpers;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Features;

internal interface IFormDataReader
{
    Task ReadStatelessFormData(object appModel, string? language = null, InstanceOwner? instanceOwner = null);

    Task<object> ProcessLoadedFormData(
        Instance instance,
        DataElement dataElement,
        object appModel,
        bool includeRowId = false,
        string? language = null,
        Func<object, CancellationToken, Task>? persistFormData = null,
        CancellationToken cancellationToken = default
    );
}

internal sealed class FormDataReader : IFormDataReader
{
    private readonly AppImplementationFactory _appImplementationFactory;
    private readonly ILogger<FormDataReader> _logger;

    public FormDataReader(AppImplementationFactory appImplementationFactory, ILogger<FormDataReader> logger)
    {
        _appImplementationFactory = appImplementationFactory;
        _logger = logger;
    }

    public async Task ReadStatelessFormData(
        object appModel,
        string? language = null,
        InstanceOwner? instanceOwner = null
    )
    {
        await RunDataProcessors(new Instance { InstanceOwner = instanceOwner }, dataId: null, appModel, language);
    }

    private async Task RunDataProcessors(Instance instance, Guid? dataId, object appModel, string? language = null)
    {
        var dataProcessors = _appImplementationFactory.GetAll<IDataProcessor>();
        foreach (var dataProcessor in dataProcessors)
        {
            _logger.LogInformation(
                "ProcessDataRead for {ModelType} using {DataProcessor}",
                appModel.GetType().Name,
                dataProcessor.GetType().Name
            );
            await dataProcessor.ProcessDataRead(instance, dataId, appModel, language);
        }
    }

    public async Task<object> ProcessLoadedFormData(
        Instance instance,
        DataElement dataElement,
        object appModel,
        bool includeRowId = false,
        string? language = null,
        Func<object, CancellationToken, Task>? persistFormData = null,
        CancellationToken cancellationToken = default
    )
    {
        byte[]? beforeProcessDataRead = null;
        if (persistFormData is not null)
        {
            // Keep a copy to determine if ProcessDataRead changed the model.
            beforeProcessDataRead = JsonSerializer.SerializeToUtf8Bytes(appModel);
        }

        Guid? resolvedDataId = Guid.TryParse(dataElement.Id, out var parsedDataId) ? parsedDataId : null;

        await RunDataProcessors(instance, resolvedDataId, appModel, language);

        if (includeRowId)
        {
            ObjectUtils.InitializeAltinnRowId(appModel);
        }

        if (
            persistFormData is not null
            && beforeProcessDataRead is not null
            && !dataElement.Locked
            && !beforeProcessDataRead.SequenceEqual(JsonSerializer.SerializeToUtf8Bytes(appModel))
        )
        {
            try
            {
                await persistFormData(appModel, cancellationToken);
            }
            catch (PlatformHttpException e) when (e.Response.StatusCode is System.Net.HttpStatusCode.Forbidden)
            {
                _logger.LogInformation("User does not have write access to the data element. Skipping update.");
            }
        }

        if (!includeRowId)
        {
            ObjectUtils.RemoveAltinnRowId(appModel);
        }

        return appModel;
    }
}
