#nullable enable
using System;
using System.Threading.Tasks;
using Altinn.App.Core.Features;
using Altinn.App.Models.TransitionControl;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Logic;

/// <summary>
/// Keeps the levers mutually consistent: post-commit failures are always retryable
/// (<see cref="ControlEventsClient"/> throws inside MovedToAltinnEvent, which wraps every throw as a
/// retryable engine failure), so "permanent" is meaningless in the postCommit phase. The frontend
/// hides the permanent option (optionFilter on the failKind radios); this processor is the
/// authoritative half that rewrites a stored/blank failKind to "retryable", which the data sync
/// reflects back as an automatic selection of the retryable radio.
/// </summary>
public sealed class TransitionControlDataProcessor : IDataProcessor
{
    public Task ProcessDataRead(Instance instance, Guid? dataId, object data, string? language) =>
        Task.CompletedTask;

    public Task ProcessDataWrite(
        Instance instance,
        Guid? dataId,
        object data,
        object? previousData,
        string? language
    )
    {
        if (data is TransitionControl levers && levers.phase == "postCommit")
        {
            levers.failKind = "retryable";
        }
        return Task.CompletedTask;
    }
}
