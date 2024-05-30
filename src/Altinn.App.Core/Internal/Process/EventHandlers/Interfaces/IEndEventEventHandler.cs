using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process.EventHandlers;

/// <summary>
/// Interface for end event handlers, which are executed when a process end event is triggered.
/// </summary>
public interface IEndEventEventHandler
{
    /// <summary>
    /// Execute the end event handler
    /// </summary>
    Task Execute(InstanceEvent instanceEvent, Instance instance);
}
