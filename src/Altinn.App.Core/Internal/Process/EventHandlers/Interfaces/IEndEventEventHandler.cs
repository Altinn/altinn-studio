using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process.EventHandlers
{
    /// <summary>
    /// Interface for end event handlers, which are executed when a process end event is triggered.
    /// </summary>
    public interface IEndEventEventHandler
    {
        /// <summary>
        /// Execute the end event handler
        /// </summary>
        /// <param name="instanceEvent"></param>
        /// <param name="instance"></param>
        /// <returns></returns>
        Task Execute(InstanceEvent instanceEvent, Instance instance);
    }
}