using Altinn.App.Core.Constants;

namespace Altinn.App.Core.Internal.Process.ProcessTasks;

/// <summary>
/// Represents the process task responsible for waiting for feedback from application owner.
/// </summary>
public class FeedbackProcessTask : IProcessTask
{
    /// <inheritdoc/>
    public string Type => AltinnTaskTypes.Feedback;
}
