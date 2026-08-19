using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine;

internal sealed record ProcessNextWorkflowResult(
    Instance Instance,
    WorkflowFailure? WorkflowFailure,
    bool ProcessStateChanged
);
