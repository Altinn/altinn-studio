using System;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.EventHandlers;

public interface IFileSyncHandlerExecutor
{
    /// <summary>
    /// Executes the specified handler function with exception handling and sends a notification to a syncHub if handler function returns true.
    /// </summary>
    /// <param name="editingContext">The context for repository editing operations.</param>
    /// <param name="errorCode">The error code to use if an exception occurs.</param>
    /// <param name="sourcePath">The source path associated with any altered file.</param>
    /// <param name="handlerFunction">A function to be executed, which returns a bool that indicates whether any file changes was made.</param>
    /// <returns>A task representing the asynchronous operation.</returns>
    /// <remarks>
    /// This method executes the provided handler function within the context of exception handling. 
    /// If an exception is thrown during the execution of the handler function, it will handle the exception 
    /// and use the provided error code for notification to a syncHub. Additionally, if the handler function
    /// returns <c>true</c>, indicating altered files, success notifications are triggered to the syncHub.
    /// </remarks>
    Task ExecuteWithExceptionHandlingAndConditionalNotification(AltinnRepoEditingContext editingContext, string errorCode, string sourcePath,
      Func<Task<bool>> handlerFunction);

}
