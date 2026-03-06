using System.Net;
using System.Text.Json;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Data;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Features;

internal interface IFormDataReader
{
    Task ReadStatelessFormData(object appModel, string? language = null, InstanceOwner? instanceOwner = null);

    Task<object> ReadInstanceFormData(
        Instance instance,
        DataElement dataElement,
        Guid? dataId = null,
        bool includeRowId = false,
        string? language = null,
        bool persistProcessDataReadChanges = true,
        CancellationToken cancellationToken = default
    );
}

internal sealed class FormDataReader : IFormDataReader
{
    private readonly IDataClient _dataClient;
    private readonly AppImplementationFactory _appImplementationFactory;
    private readonly ILogger<FormDataReader> _logger;

    public FormDataReader(
        IDataClient dataClient,
        AppImplementationFactory appImplementationFactory,
        ILogger<FormDataReader> logger
    )
    {
        _dataClient = dataClient;
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

    public async Task<object> ReadInstanceFormData(
        Instance instance,
        DataElement dataElement,
        Guid? dataId = null,
        bool includeRowId = false,
        string? language = null,
        bool persistProcessDataReadChanges = true,
        CancellationToken cancellationToken = default
    )
    {
        object appModel = await _dataClient.GetFormData(instance, dataElement, cancellationToken: cancellationToken);

        byte[]? beforeProcessDataRead = null;
        if (persistProcessDataReadChanges)
        {
            // Keep a copy to determine if ProcessDataRead changed the model.
            beforeProcessDataRead = JsonSerializer.SerializeToUtf8Bytes(appModel);
        }

        var resolvedDataId = dataId;
        if (resolvedDataId is null && Guid.TryParse(dataElement.Id, out var parsedDataId))
        {
            resolvedDataId = parsedDataId;
        }

        await RunDataProcessors(instance, resolvedDataId, appModel, language);

        if (includeRowId)
        {
            ObjectUtils.InitializeAltinnRowId(appModel);
        }

        if (
            persistProcessDataReadChanges
            && beforeProcessDataRead is not null
            && !dataElement.Locked
            && !beforeProcessDataRead.SequenceEqual(JsonSerializer.SerializeToUtf8Bytes(appModel))
        )
        {
            try
            {
                await _dataClient.UpdateFormData(instance, appModel, dataElement, cancellationToken: cancellationToken);
            }
            catch (PlatformHttpException e) when (e.Response.StatusCode is HttpStatusCode.Forbidden)
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
