namespace Altinn.Studio.Designer.TypedHttpClients.Operator.Models;

/// <summary>
/// The run that <see cref="IOperatorClient.CreateRun"/> created or found.
/// </summary>
/// <param name="Run">The run. Follow it the same way whether the operator created it or found it.</param>
/// <param name="Created">
/// True when the operator created and queued the run. False when Designer already had a run of the kind for the
/// source in progress, and the operator answered with that one.
/// </param>
internal sealed record CreateRunResponse(Run Run, bool Created);
