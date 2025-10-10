using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;

namespace Altinn.App.Core.Internal.Process;

/// <summary>
/// Extension methods for <see cref="IProcessReader"/>. Utility functions etc.
/// </summary>
internal static class ProcessReaderExtensions
{
    /// <summary>
    /// Checks if the action is included in the AltinnActions list for the given task, which means it is allowed for the task.
    /// </summary>
    public static bool IsActionAllowedForTask(this IProcessReader processReader, string taskId, string action)
    {
        if (string.IsNullOrEmpty(action))
        {
            return false;
        }

        AltinnTaskExtension? altinnTaskExtension = processReader.GetAltinnTaskExtension(taskId);

        return altinnTaskExtension?.AltinnActions?.Select(x => x.Value).Contains(action) is true;
    }
}
