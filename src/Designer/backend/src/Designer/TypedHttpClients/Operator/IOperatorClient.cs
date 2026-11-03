using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.TypedHttpClients.Operator.Models;

namespace Altinn.Studio.Designer.TypedHttpClients.Operator;

/// <summary>
/// The core-operator's run API, which runs app code in a sandbox Job. The contract is
/// <c>src/core/operator/api/openapi.yaml</c>.
/// </summary>
/// <remarks>
/// <para>
/// The core-operator runs in the Studio cluster. Designer never calls the operator in <c>src/Runtime/operator</c>,
/// which runs in each runtime cluster.
/// </para>
/// <para>A run goes like this:</para>
/// <list type="number">
/// <item><description>Create the run with <see cref="CreateRun"/>.</description></item>
/// <item><description>
/// Follow it with <see cref="GetRun"/> until its status is <see cref="RunStatus.AwaitingArchive"/>. Then upload the
/// archive of the source's commit with <see cref="UploadArchive"/>.
/// </description></item>
/// <item><description>
/// Follow it until it has ended. When it completed, fetch the result with <see cref="GetRunResult"/> within
/// <see cref="Kind.ResultTimeoutSeconds"/>.
/// </description></item>
/// </list>
/// <para>
/// The operator's workflow engine keeps the run, so Designer needs no store of its own. After a restart, Designer
/// finds its runs again by their source with <see cref="FindRuns"/>.
/// </para>
/// <para>
/// Designer sees only its own runs and the kinds the operator allows it. Each method throws an
/// <see cref="OperatorException"/> when the operator answers with an error.
/// </para>
/// </remarks>
internal interface IOperatorClient
{
    /// <summary>
    /// Lists the kinds Designer may run in this environment. An empty list means that the environment runs no
    /// sandbox Jobs.
    /// </summary>
    Task<IReadOnlyList<Kind>> ListKinds(CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates and queues a run of a kind for a source, or finds the run of that kind for that source that Designer
    /// already has in progress. A repeated create therefore starts no second run, and a create after the run has
    /// ended starts a new one.
    /// </summary>
    /// <remarks>
    /// The operator answers 409 when the run in progress has other arguments, and 429 when the queue of the kind
    /// holds as many of Designer's runs as the kind allows.
    /// </remarks>
    /// <param name="kind">A kind from <see cref="ListKinds"/>.</param>
    /// <param name="source">The app and the commit that the run is for.</param>
    /// <param name="args">
    /// The arguments of the run, by name. The kind lists the names it accepts in <see cref="Kind.Args"/>. Null or
    /// empty sends none.
    /// </param>
    /// <param name="cancellationToken">Cancels the request.</param>
    Task<CreateRunResponse> CreateRun(
        string kind,
        RunSource source,
        IReadOnlyDictionary<string, string>? args = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Finds Designer's runs whose source matches the filter, newest first, at most 20. An empty list means that
    /// Designer has no such run.
    /// </summary>
    /// <param name="filter">The values to match. Set at least one.</param>
    /// <param name="cancellationToken">Cancels the request.</param>
    /// <exception cref="ArgumentException">The filter has no value set.</exception>
    Task<IReadOnlyList<Run>> FindRuns(RunFilter filter, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a run.
    /// </summary>
    /// <param name="runId">The run.</param>
    /// <param name="waitSeconds">
    /// How long the operator waits for the status or the queue position to change before it answers, from 0 to
    /// <see cref="OperatorClient.MaxWaitSeconds"/>. 0 answers at once.
    /// </param>
    /// <param name="cancellationToken">Cancels the request.</param>
    Task<Run> GetRun(Guid runId, int waitSeconds = 0, CancellationToken cancellationToken = default);

    /// <summary>
    /// Uploads the archive of a run whose status is <see cref="RunStatus.AwaitingArchive"/>, and returns the run. The
    /// operator passes the archive on to the run's Job, which starts the command.
    /// </summary>
    /// <remarks>
    /// Upload within <see cref="Kind.UploadTimeoutSeconds"/>, or the run fails. An upload that broke off can be sent
    /// again. The operator answers 409 when the run does not await its archive, such as while it is queued or
    /// starting, or after it has ended.
    /// </remarks>
    /// <param name="runId">The run.</param>
    /// <param name="archive">
    /// A gzip tar of the app at the commit of the run's source, without <c>.git</c>, of at most 50 MiB. The caller
    /// owns the stream, and the client leaves it open.
    /// </param>
    /// <param name="cancellationToken">Cancels the request.</param>
    Task<Run> UploadArchive(Guid runId, Stream archive, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the result of a run that completed. Fetch it within <see cref="Kind.ResultTimeoutSeconds"/> of the end
    /// of the run. After the first fetch, the operator keeps the result for 30 seconds more, for a fetch that broke
    /// off, and then deletes it.
    /// </summary>
    /// <remarks>
    /// The operator answers 409 before the run has finished or when it finished without a result, and 410 once the
    /// result has expired. A new run gives the result again.
    /// </remarks>
    Task<RunResult> GetRunResult(Guid runId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Cancels a run, and returns it. The operator deletes the Job of a run it cancels. A run that had already
    /// finished keeps its status.
    /// </summary>
    Task<Run> CancelRun(Guid runId, CancellationToken cancellationToken = default);
}
