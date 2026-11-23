using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine;

internal sealed record ProcessNextWorkflowResult(
    Instance Instance,
    StorageVersionMetadata InstanceVersions,
    WorkflowFailure? WorkflowFailure,
    bool ProcessStateCommitted,
    // The wait released a committed chain that is parked (a deferring service task, or a Held receiver waiting for
    // its message), so the chain goes on after this result.
    bool Parked = false
);
