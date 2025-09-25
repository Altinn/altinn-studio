using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.DataProcessing;

/// <summary>
/// Convenience class for implementing <see cref="IDataProcessor"/> for a specific model type.
/// </summary>
public abstract class GenericDataProcessor<TModel> : IDataProcessor
    where TModel : class
{
    /// <summary>
    /// Do changes to the model after it has been read from storage, but before it is returned to the app.
    /// this only executes on page load and not for subsequent updates.
    /// </summary>
    public abstract Task ProcessDataRead(Instance instance, Guid? dataId, TModel model, string? langauge);

    /// <summary>
    /// Do changes to the model before it is written to storage, and report back to frontend.
    /// Tyipically used to add calculated values to the model.
    /// </summary>
    public abstract Task ProcessDataWrite(
        Instance instance,
        Guid? dataId,
        TModel model,
        TModel? previousModel,
        string? language
    );

    /// <inheritdoc />
    public async Task ProcessDataRead(Instance instance, Guid? dataId, object data, string? language)
    {
        if (data is TModel model)
        {
            await ProcessDataRead(instance, dataId, model, language);
        }
    }

    /// <inheritdoc />
    public async Task ProcessDataWrite(
        Instance instance,
        Guid? dataId,
        object data,
        object? previousData,
        string? language
    )
    {
        if (data is TModel model)
        {
            await ProcessDataWrite(instance, dataId, model, previousData as TModel, language);
        }
    }
}
