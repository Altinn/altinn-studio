using Altinn.Studio.Common.Domain;

namespace Altinn.Studio.Fleet;

/// <summary>Follows a sync while it runs. The engine calls it from several threads.</summary>
public interface ISyncObserver
{
    /// <summary>Called when a stage starts and as it makes progress.</summary>
    void OnProgress(SyncProgress progress);
}

/// <summary>How far a sync of an environment has come.</summary>
/// <param name="Environment">The environment.</param>
/// <param name="Stage">The stage it is in.</param>
/// <param name="Completed">How many of the stage's items are done.</param>
/// <param name="Total">How many items the stage has.</param>
public readonly record struct SyncProgress(RuntimeEnvironment Environment, SyncStage Stage, int Completed, int Total);

/// <summary>The stages of a sync of an environment.</summary>
public enum SyncStage
{
    /// <summary>Asking each service owner's cluster which apps it runs.</summary>
    Discovering,

    /// <summary>Finding the commit each changed app was released from.</summary>
    Resolving,

    /// <summary>Downloading and extracting changed apps.</summary>
    Fetching,

    /// <summary>Rebuilding the index from the files on disk.</summary>
    Indexing,
}
