using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine;

internal sealed record ProcessNextWorkflowResult(
    Instance Instance,
    StorageVersionMetadata InstanceVersions,
    WorkflowFailure? WorkflowFailure,
    bool ProcessStateChanged
);
