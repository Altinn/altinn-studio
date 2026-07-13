using System.Text;
using System.Xml;
using System.Xml.Linq;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.ParkedServiceTaskMigration;

/// <summary>
/// Rewrites a process.bpmn file to remove feedback waiting steps that v9 makes redundant.
///
/// In v8, the <c>fiksArkiv</c> and <c>eFormidling</c> service tasks auto-advanced as soon as the
/// outbound message was sent, so processes placed a <c>feedback</c> task after them for the instance
/// to wait in until the asynchronous reply arrived (the reply handler then advanced the feedback
/// task). In v9 these service tasks <em>park</em>: the process waits on the service task itself and
/// the reply handler advances it directly - a trailing feedback task would never be advanced by
/// anything and the instance would be stuck in it forever.
///
/// Only shapes whose post-migration routing is provably identical to the v8 behaviour are rewritten;
/// everything else is left untouched with a warning (see the scenario checks below). We rely on
/// <c>sequenceFlow</c> <c>sourceRef</c>/<c>targetRef</c> (what the process engine uses), and treat
/// the informational <c>&lt;incoming&gt;</c>/<c>&lt;outgoing&gt;</c> child elements as best-effort
/// hints.
/// </summary>
internal sealed class ParkedServiceTaskProcessRewriter
{
    /// <summary>Task types that park in v9 (wait on their own task for the asynchronous reply).</summary>
    private static readonly string[] ParkedTaskTypes = ["fiksArkiv", "eFormidling"];

    private const string FeedbackTaskType = "feedback";

    /// <summary>Sentinel for a flow that is the gateway's declared default flow.</summary>
    private const string DefaultConditionSentinel = "<default>";

    /// <summary>Sentinel for a flow with no condition that is not the declared default either.</summary>
    private const string UnconditionalSentinel = "<unconditional>";

    private readonly XDocument _doc;
    private readonly string _processFile;
    private readonly List<string> _warnings = new();
    private readonly List<string> _notes = new();
    private readonly List<string> _removedFeedbackTasks = new();
    private readonly bool _sourceHadBom;
    private readonly string _newline;
    private readonly bool _hadTrailingNewline;

    public ParkedServiceTaskProcessRewriter(string processFile)
    {
        _processFile = processFile;
        // Strict decode: throws DecoderFallbackException on non-UTF-8 content instead of silently
        // corrupting it, and strips the BOM (XDocument.Parse rejects a leading BOM character).
        var (text, hadBom) = Utf8TextFile.Decode(File.ReadAllBytes(processFile));
        _sourceHadBom = hadBom;
        _newline = text.Contains("\r\n", StringComparison.Ordinal) ? "\r\n" : "\n";
        _hadTrailingNewline = text.EndsWith('\n');
        _doc = XDocument.Parse(text);
    }

    public IReadOnlyList<string> GetWarnings() => _warnings;

    /// <summary>
    /// Informational messages (behaviour notes and applied removals) that are not warnings - the
    /// caller prints them as regular output.
    /// </summary>
    public IReadOnlyList<string> GetNotes() => _notes;

    /// <summary>Ids of the feedback tasks that were removed, for follow-up checks (orphaned UI folders).</summary>
    public IReadOnlyList<string> RemovedFeedbackTaskIds => _removedFeedbackTasks;

    /// <summary>Whether any rewrite actually changed the document; false means nothing to write.</summary>
    public bool HasChanges { get; private set; }

    /// <summary>
    /// Whether a shape was found that needs the waiting step removed (or reviewed) but could not be
    /// resolved automatically. The corresponding warning explains what to do.
    /// </summary>
    public bool ManualActionRequired { get; private set; }

    /// <summary>
    /// Analyzes every parked service task in the process and removes the feedback waiting steps that
    /// are provably redundant under v9 parking semantics. Changes are held in memory until
    /// <see cref="Write"/> is called.
    /// </summary>
    public void RemoveRedundantWaitSteps()
    {
        List<XElement> processes = _doc.Root?.Elements().Where(e => e.Name.LocalName == "process").ToList() ?? [];
        if (processes.Count != 1)
        {
            // Only relevant when a parked service task exists somewhere in the document at all.
            if (_doc.Descendants().Any(IsParkedServiceTask))
            {
                _warnings.Add(
                    $"process.bpmn contains {processes.Count} <process> element(s) (expected exactly 1); skipped "
                        + "the waiting-step analysis for the fiksArkiv/eFormidling service task(s). Review the "
                        + "process manually: these service tasks now wait for their asynchronous reply, so a "
                        + "trailing 'feedback' waiting step is never advanced and must be removed."
                );
                ManualActionRequired = true;
            }

            return;
        }

        var process = processes[0];
        var plane = _doc.Descendants().FirstOrDefault(e => e.Name.LocalName == "BPMNPlane");

        List<XElement> parkedTasks = process.Elements().Where(IsParkedServiceTask).ToList();
        foreach (var serviceTask in parkedTasks)
        {
            AnalyzeParkedServiceTask(process, plane, serviceTask);
        }

        if (plane is not null && HasChanges)
        {
            _warnings.Add(
                "The process has a BPMN diagram. Shapes and edges for the removed waiting step(s) were "
                    + "updated with best-effort geometry - open the process in Altinn Studio Designer to "
                    + "auto-arrange the layout if desired."
            );
        }
    }

    private void AnalyzeParkedServiceTask(XElement process, XElement? plane, XElement serviceTask)
    {
        var taskId = serviceTask.Attribute("id")?.Value;
        var taskType = GetAltinnTaskType(serviceTask) ?? "?";
        if (taskId is null)
        {
            _warnings.Add(
                $"A '{taskType}' service task has no id attribute; skipped the waiting-step analysis for it. "
                    + "Fix the process file and re-run the upgrade."
            );
            ManualActionRequired = true;
            return;
        }

        List<XElement> outgoing = FlowsFrom(process, taskId);
        if (outgoing.Count != 1)
        {
            _warnings.Add(
                $"Service task '{taskId}' ({taskType}) has {outgoing.Count} outgoing sequence flows (expected "
                    + "exactly 1); skipped the waiting-step analysis for it. The task now waits for its "
                    + "asynchronous reply - review manually that no trailing 'feedback' waiting step depends "
                    + "on it, and remove any such step."
            );
            ManualActionRequired = true;
            return;
        }

        var target = ResolveTarget(process, outgoing[0]);
        if (target is null)
        {
            _warnings.Add(
                $"Service task '{taskId}' ({taskType}) has an outgoing sequence flow with a missing or "
                    + "unresolvable targetRef; skipped the waiting-step analysis for it. Fix the process file "
                    + "and re-run the upgrade."
            );
            ManualActionRequired = true;
            return;
        }

        if (IsFeedbackTask(target))
        {
            TryBypassDirectWait(process, plane, taskId, taskType, outgoing[0], target);
            return;
        }

        if (IsExclusiveGateway(target))
        {
            AnalyzeGatewayWait(process, plane, taskId, taskType, target);
            return;
        }

        // No waiting step follows: nothing to rewrite, but the behaviour still changes (the process
        // used to sail past the service task; now it waits there until the reply arrives).
        _notes.Add(
            $"Service task '{taskId}' ({taskType}) has no waiting step after it. No process change needed - "
                + "note that in v9 the process waits on the service task itself until the asynchronous reply "
                + "arrives, where v8 continued immediately after sending."
        );
    }

    /// <summary>
    /// Scenario A - direct wait: <c>S --flow--> F(feedback) --out--> T</c>. Provably equivalent after
    /// removal: v8 evaluated the reply action at T (F's single outgoing flow is unconditional), and
    /// so does the rewritten <c>S --flow--> T</c>.
    /// </summary>
    private void TryBypassDirectWait(
        XElement process,
        XElement? plane,
        string taskId,
        string taskType,
        XElement flow,
        XElement feedback
    )
    {
        var feedbackId = feedback.Attribute("id")?.Value;
        if (feedbackId is null)
            return;

        var shape = ValidateFeedbackShape(process, feedbackId, feedsOnlyFrom: taskId, taskId, taskType);
        if (shape is null)
            return;

        var (feedbackOut, successorId) = shape.Value;
        if (successorId == taskId)
        {
            _warnings.Add(
                $"The waiting step '{feedbackId}' after service task '{taskId}' ({taskType}) flows back into "
                    + "the service task itself; removing it would create a self-loop. Left the process "
                    + "unchanged - review and remove the waiting step manually."
            );
            ManualActionRequired = true;
            return;
        }

        // Chained waiting steps (S -> F1 -> F2): splicing out F1 would leave F2, which is equally
        // never advanced under parking semantics - the migration must not report this shape clean.
        var successor = process.Elements().FirstOrDefault(e => e.Attribute("id")?.Value == successorId);
        if (successor is not null && IsFeedbackTask(successor))
        {
            _warnings.Add(
                $"The waiting step '{feedbackId}' after service task '{taskId}' ({taskType}) is followed by "
                    + $"another 'feedback' waiting step ('{successorId}'). Removing only the first would leave "
                    + "a chained waiting step that is never advanced, so the process was left unchanged. The "
                    + "service task now waits for its asynchronous reply - review the process and remove the "
                    + "chained waiting steps manually."
            );
            ManualActionRequired = true;
            return;
        }

        Bypass(process, plane, sourceId: taskId, flow, feedback, feedbackId, feedbackOut, successorId);
        _notes.Add(
            $"Removed waiting step '{feedbackId}': service task '{taskId}' ({taskType}) now parks until its "
                + $"asynchronous reply arrives, and the reply advances it directly to '{successorId}'."
        );
    }

    /// <summary>
    /// Scenario B - gateway wait: <c>S --> G1(exclusive) --branch--> F(feedback) --out--> T(exclusive)</c>.
    /// After removal the reply action is evaluated at G1 instead of T, so equivalence requires every
    /// non-waiting branch of G1 to have a matching branch (same condition, same target) on T: any
    /// action that escapes at G1 post-migration would have escaped to the same place at T pre-migration.
    /// </summary>
    private void AnalyzeGatewayWait(XElement process, XElement? plane, string taskId, string taskType, XElement gateway)
    {
        var gatewayId = gateway.Attribute("id")?.Value;
        if (gatewayId is null)
            return;

        List<XElement> gatewayOut = FlowsFrom(process, gatewayId);
        List<(XElement Flow, XElement Feedback)> feedbackBranches = [];
        foreach (var branch in gatewayOut)
        {
            if (ResolveTarget(process, branch) is { } branchTarget && IsFeedbackTask(branchTarget))
                feedbackBranches.Add((branch, branchTarget));
        }

        if (feedbackBranches.Count == 0)
        {
            if (FeedbackReachableThroughGateways(process, gateway, visited: []))
            {
                _warnings.Add(
                    $"Service task '{taskId}' ({taskType}) reaches a 'feedback' waiting step through more than "
                        + "one gateway. This shape cannot be rewritten automatically - the task now waits for "
                        + "its asynchronous reply, so the waiting step is never advanced and must be removed. "
                        + "Review the process and rewire it manually."
                );
                ManualActionRequired = true;
                return;
            }

            _notes.Add(
                $"Service task '{taskId}' ({taskType}) has no waiting step after it. No process change needed - "
                    + "note that in v9 the process waits on the service task itself until the asynchronous reply "
                    + "arrives, where v8 continued immediately after sending."
            );
            return;
        }

        // The gateway must be fed only by parked service tasks: any other inbound path also routed
        // through this gateway in v8, and removing the waiting step would change where it lands.
        List<XElement> gatewayInbound = FlowsTo(process, gatewayId);
        List<string> foreignFeeds = gatewayInbound
            .Select(f => ResolveSource(process, f))
            .Where(source => source is null || !IsParkedServiceTask(source))
            .Select(source => source?.Attribute("id")?.Value ?? "?")
            .ToList();
        if (foreignFeeds.Count > 0)
        {
            _warnings.Add(
                $"The gateway '{gatewayId}' between service task '{taskId}' ({taskType}) and its 'feedback' "
                    + $"waiting step is also fed by [{string.Join(", ", foreignFeeds)}], which are not parked "
                    + "service tasks. Removing the waiting step would change routing for those paths, so the "
                    + "process was left unchanged. The service task now waits for its asynchronous reply - "
                    + "review the process and remove the waiting step manually."
            );
            ManualActionRequired = true;
            return;
        }

        foreach (var (branchFlow, feedback) in feedbackBranches)
        {
            var feedbackId = feedback.Attribute("id")?.Value;
            if (feedbackId is null)
                continue;

            var shape = ValidateFeedbackShape(process, feedbackId, feedsOnlyFrom: gatewayId, taskId, taskType);
            if (shape is null)
                continue;

            var (feedbackOut, successorId) = shape.Value;
            var successor = process.Elements().FirstOrDefault(e => e.Attribute("id")?.Value == successorId);

            if (successor is null || !IsExclusiveGateway(successor) || successorId == gatewayId)
            {
                _warnings.Add(
                    $"The waiting step '{feedbackId}' after service task '{taskId}' ({taskType}) is entered "
                        + $"through gateway '{gatewayId}' but is not followed by a separate exclusive gateway. "
                        + "After removal the reply action would be evaluated at the entry gateway, which can "
                        + "route differently than the v8 behaviour, so the process was left unchanged. The "
                        + "service task now waits for its asynchronous reply - review the process and remove "
                        + "the waiting step manually."
                );
                ManualActionRequired = true;
                continue;
            }

            if (!EscapeBranchesAgree(process, gateway, gatewayId, branchFlow, successor, successorId, out var why))
            {
                _warnings.Add(
                    $"The waiting step '{feedbackId}' after service task '{taskId}' ({taskType}) could not be "
                        + $"removed automatically: {why} After removal the reply action is evaluated at "
                        + $"'{gatewayId}' instead of '{successorId}', which would change routing. The service "
                        + "task now waits for its asynchronous reply - review the process and remove the "
                        + "waiting step manually."
                );
                ManualActionRequired = true;
                continue;
            }

            if (!WaitingBranchReceivesReply(process, gateway, gatewayId, branchFlow, out var whyWaiting))
            {
                _warnings.Add(
                    $"The waiting step '{feedbackId}' after service task '{taskId}' ({taskType}) could not be "
                        + $"removed automatically: {whyWaiting} A reply action could then match no branch of "
                        + $"'{gatewayId}' at all and strand the process, so it was left unchanged. The service "
                        + "task now waits for its asynchronous reply - review the process and remove the "
                        + "waiting step manually."
                );
                ManualActionRequired = true;
                continue;
            }

            Bypass(process, plane, sourceId: gatewayId, branchFlow, feedback, feedbackId, feedbackOut, successorId);
            _notes.Add(
                $"Removed waiting step '{feedbackId}': service task '{taskId}' ({taskType}) now parks until its "
                    + $"asynchronous reply arrives, and the reply routes through '{gatewayId}' directly to "
                    + $"'{successorId}'."
            );
        }
    }

    /// <summary>
    /// Shared feedback-shape validation: the waiting step must be fed only by
    /// <paramref name="feedsOnlyFrom"/> and have exactly one unconditional outgoing flow, otherwise
    /// removing it is not provably safe.
    /// </summary>
    private (XElement FeedbackOut, string SuccessorId)? ValidateFeedbackShape(
        XElement process,
        string feedbackId,
        string feedsOnlyFrom,
        string taskId,
        string taskType
    )
    {
        List<string> otherFeeds = FlowsTo(process, feedbackId)
            .Select(f => f.Attribute("sourceRef")?.Value ?? "?")
            .Where(sourceId => sourceId != feedsOnlyFrom)
            .ToList();
        if (otherFeeds.Count > 0)
        {
            _warnings.Add(
                $"The waiting step '{feedbackId}' after service task '{taskId}' ({taskType}) is also entered "
                    + $"from [{string.Join(", ", otherFeeds)}]; removing it would change those paths too, so "
                    + "the process was left unchanged. The service task now waits for its asynchronous reply - "
                    + "review the process and remove the waiting step manually."
            );
            ManualActionRequired = true;
            return null;
        }

        List<XElement> feedbackOut = FlowsFrom(process, feedbackId);
        if (
            feedbackOut.Count != 1
            || HasCondition(feedbackOut[0])
            || feedbackOut[0].Attribute("targetRef") is not { Value: var successorId }
        )
        {
            _warnings.Add(
                $"The waiting step '{feedbackId}' after service task '{taskId}' ({taskType}) does not have "
                    + "exactly one unconditional outgoing sequence flow, so its removal cannot preserve the "
                    + "routing automatically and the process was left unchanged. The service task now waits "
                    + "for its asynchronous reply - review the process and remove the waiting step manually."
            );
            ManualActionRequired = true;
            return null;
        }

        return (feedbackOut[0], successorId);
    }

    /// <summary>
    /// Checks that every non-waiting branch of the entry gateway has a branch with the same
    /// (whitespace-normalized) condition and the same target on the successor gateway, so an action
    /// escaping at the entry gateway post-migration lands exactly where it would have at the
    /// successor gateway pre-migration.
    /// </summary>
    private static bool EscapeBranchesAgree(
        XElement process,
        XElement gateway,
        string gatewayId,
        XElement waitingBranch,
        XElement successor,
        string successorId,
        out string why
    )
    {
        List<XElement> successorOut = FlowsFrom(process, successorId);
        foreach (var branch in FlowsFrom(process, gatewayId))
        {
            if (branch == waitingBranch)
                continue;

            var condition = NormalizedCondition(branch, gateway);
            var target = branch.Attribute("targetRef")?.Value;
            var match = successorOut.FirstOrDefault(f => NormalizedCondition(f, successor) == condition);

            if (match is null)
            {
                why =
                    $"gateway '{gatewayId}' has a branch (to '{target}') whose condition has no matching "
                    + $"branch on gateway '{successorId}'.";
                return false;
            }

            if (match.Attribute("targetRef")?.Value != target)
            {
                why =
                    $"gateway '{gatewayId}' routes its non-waiting branch to '{target}' but gateway "
                    + $"'{successorId}' routes the same condition to '{match.Attribute("targetRef")?.Value}'.";
                return false;
            }
        }

        why = string.Empty;
        return true;
    }

    /// <summary>
    /// Checks that the entry gateway's waiting branch will actually receive the reply action after the
    /// rewrite. Post-migration the reply is evaluated at the entry gateway and the retargeted waiting
    /// branch keeps its condition, so a reply action matching no branch would strand the process at the
    /// gateway. Provably safe shapes: the waiting branch is the gateway's declared default flow, it is
    /// unconditional, or it is the exact equals/notEquals complement of a single escape branch - any
    /// action then lands on either the waiting branch or an escape branch.
    /// </summary>
    private static bool WaitingBranchReceivesReply(
        XElement process,
        XElement gateway,
        string gatewayId,
        XElement waitingBranch,
        out string why
    )
    {
        why = string.Empty;
        var waitingCondition = NormalizedCondition(waitingBranch, gateway);
        if (waitingCondition is DefaultConditionSentinel or UnconditionalSentinel)
            return true;

        List<XElement> escapeBranches = FlowsFrom(process, gatewayId).Where(f => f != waitingBranch).ToList();
        if (
            escapeBranches.Count == 1
            && AreComplementaryConditions(waitingCondition, NormalizedCondition(escapeBranches[0], gateway))
        )
        {
            return true;
        }

        why =
            $"the waiting branch of gateway '{gatewayId}' has a condition that is neither the gateway's "
            + "default flow nor the logical complement of its single escape branch.";
        return false;
    }

    /// <summary>
    /// Whether two (whitespace-normalized) conditions are exact equals/notEquals complements, e.g.
    /// <c>["equals",["gatewayAction"],"reject"]</c> vs <c>["notEquals",["gatewayAction"],"reject"]</c>.
    /// </summary>
    private static bool AreComplementaryConditions(string a, string b)
    {
        const string equalsPrefix = "[\"equals\",";
        const string notEqualsPrefix = "[\"notEquals\",";
        return (
                a.StartsWith(equalsPrefix, StringComparison.Ordinal)
                && b.StartsWith(notEqualsPrefix, StringComparison.Ordinal)
                && a[equalsPrefix.Length..] == b[notEqualsPrefix.Length..]
            )
            || (
                a.StartsWith(notEqualsPrefix, StringComparison.Ordinal)
                && b.StartsWith(equalsPrefix, StringComparison.Ordinal)
                && a[notEqualsPrefix.Length..] == b[equalsPrefix.Length..]
            );
    }

    /// <summary>
    /// Removes the waiting step: retargets its incoming flow to its successor, deletes the waiting
    /// step and its outgoing flow, repoints the informational hints, and keeps the diagram complete.
    /// </summary>
    private void Bypass(
        XElement process,
        XElement? plane,
        string sourceId,
        XElement incomingFlow,
        XElement feedback,
        string feedbackId,
        XElement feedbackOut,
        string successorId
    )
    {
        HasChanges = true;

        incomingFlow.SetAttributeValue("targetRef", successorId);

        // Best-effort: repoint the successor's <incoming> hint from the deleted flow to the
        // retargeted one.
        var feedbackOutId = feedbackOut.Attribute("id")?.Value;
        var incomingFlowId = incomingFlow.Attribute("id")?.Value;
        var successor = process.Elements().FirstOrDefault(e => e.Attribute("id")?.Value == successorId);
        var incomingHint = successor
            ?.Elements()
            .FirstOrDefault(e => e.Name.LocalName == "incoming" && e.Value == feedbackOutId);
        if (incomingHint is not null && incomingFlowId is not null)
            incomingHint.SetValue(incomingFlowId);

        feedbackOut.Remove();
        feedback.Remove();
        _removedFeedbackTasks.Add(feedbackId);

        if (plane is null)
            return;

        FindShape(plane, feedbackId)?.Remove();
        if (feedbackOutId is not null)
            FindEdge(plane, feedbackOutId)?.Remove();

        // Rewire the retargeted flow's edge as a straight line between the source and successor
        // shapes. Placement is best-effort; skipped (leaving the stale-but-valid waypoints) when
        // either shape is missing - the generic diagram warning covers it.
        if (incomingFlowId is null)
            return;
        var edge = FindEdge(plane, incomingFlowId);
        var sourceBounds = GetBounds(FindShape(plane, sourceId));
        var successorBounds = GetBounds(FindShape(plane, successorId));
        if (edge is null || sourceBounds is null || successorBounds is null)
            return;

        var (sx, sy, sw, sh) = sourceBounds.Value;
        var (tx, ty, _, th) = successorBounds.Value;
        edge.Elements().Where(e => e.Name.LocalName == "waypoint").Remove();
        edge.Add(
            Waypoint((int)Math.Round(sx + sw), (int)Math.Round(sy + sh / 2)),
            Waypoint((int)Math.Round(tx), (int)Math.Round(ty + th / 2))
        );
    }

    /// <summary>
    /// Whether a 'feedback' task is reachable from this element through exclusive gateways only
    /// (used to detect nested-gateway waiting shapes we do not rewrite automatically).
    /// </summary>
    private static bool FeedbackReachableThroughGateways(XElement process, XElement element, HashSet<string> visited)
    {
        if (!IsExclusiveGateway(element))
            return IsFeedbackTask(element);

        var id = element.Attribute("id")?.Value;
        if (id is null || !visited.Add(id))
            return false;

        return FlowsFrom(process, id)
            .Select(f => ResolveTarget(process, f))
            .Any(next => next is not null && FeedbackReachableThroughGateways(process, next, visited));
    }

    private static string NormalizedCondition(XElement flow, XElement gateway)
    {
        var condition = flow.Elements().FirstOrDefault(e => e.Name.LocalName == "conditionExpression");
        if (condition is not null)
            return string.Concat(condition.Value.Where(c => !char.IsWhiteSpace(c)));

        var flowId = flow.Attribute("id")?.Value;
        return flowId is not null && gateway.Attribute("default")?.Value == flowId
            ? DefaultConditionSentinel
            : UnconditionalSentinel;
    }

    private static bool IsParkedServiceTask(XElement element) =>
        GetAltinnTaskType(element) is { } taskType
        && ParkedTaskTypes.Any(parked => string.Equals(parked, taskType, StringComparison.OrdinalIgnoreCase));

    private static bool IsFeedbackTask(XElement element) =>
        string.Equals(GetAltinnTaskType(element), FeedbackTaskType, StringComparison.OrdinalIgnoreCase);

    private static bool IsExclusiveGateway(XElement element) => element.Name.LocalName == "exclusiveGateway";

    private static bool HasCondition(XElement flow) =>
        flow.Elements().Any(e => e.Name.LocalName == "conditionExpression");

    /// <summary>
    /// The altinn task type of a task-like element (<c>task</c> or <c>serviceTask</c>), or null.
    /// </summary>
    private static string? GetAltinnTaskType(XElement element)
    {
        if (element.Name.LocalName is not ("task" or "serviceTask"))
            return null;

        return element
            .Elements()
            .Where(e => e.Name.LocalName == "extensionElements")
            .Descendants()
            .FirstOrDefault(e => e.Name.LocalName == "taskType")
            ?.Value.Trim();
    }

    private static List<XElement> FlowsFrom(XElement process, string sourceId) =>
        process
            .Elements()
            .Where(e => e.Name.LocalName == "sequenceFlow" && e.Attribute("sourceRef")?.Value == sourceId)
            .ToList();

    private static List<XElement> FlowsTo(XElement process, string targetId) =>
        process
            .Elements()
            .Where(e => e.Name.LocalName == "sequenceFlow" && e.Attribute("targetRef")?.Value == targetId)
            .ToList();

    private static XElement? ResolveTarget(XElement process, XElement flow)
    {
        var targetRef = flow.Attribute("targetRef")?.Value;
        return targetRef is null ? null : process.Elements().FirstOrDefault(e => e.Attribute("id")?.Value == targetRef);
    }

    private static XElement? ResolveSource(XElement process, XElement flow)
    {
        var sourceRef = flow.Attribute("sourceRef")?.Value;
        return sourceRef is null ? null : process.Elements().FirstOrDefault(e => e.Attribute("id")?.Value == sourceRef);
    }

    private static XElement? FindShape(XElement plane, string bpmnElement) =>
        plane
            .Elements()
            .FirstOrDefault(e => e.Name.LocalName == "BPMNShape" && e.Attribute("bpmnElement")?.Value == bpmnElement);

    private static XElement? FindEdge(XElement plane, string bpmnElement) =>
        plane
            .Elements()
            .FirstOrDefault(e => e.Name.LocalName == "BPMNEdge" && e.Attribute("bpmnElement")?.Value == bpmnElement);

    private static (double X, double Y, double Width, double Height)? GetBounds(XElement? shape)
    {
        var bounds = shape?.Elements().FirstOrDefault(e => e.Name.LocalName == "Bounds");
        if (
            bounds is null
            || !TryParse(bounds.Attribute("x"), out var x)
            || !TryParse(bounds.Attribute("y"), out var y)
            || !TryParse(bounds.Attribute("width"), out var w)
            || !TryParse(bounds.Attribute("height"), out var h)
        )
        {
            return null;
        }

        return (x, y, w, h);
    }

    private static bool TryParse(XAttribute? attr, out double value)
    {
        value = 0;
        return attr is not null
            && double.TryParse(
                attr.Value,
                System.Globalization.NumberStyles.Float,
                System.Globalization.CultureInfo.InvariantCulture,
                out value
            );
    }

    private static XElement Waypoint(int x, int y) =>
        new(
            (XNamespace)"http://www.omg.org/spec/DD/20100524/DI" + "waypoint",
            new XAttribute("x", x.ToString(System.Globalization.CultureInfo.InvariantCulture)),
            new XAttribute("y", y.ToString(System.Globalization.CultureInfo.InvariantCulture))
        );

    /// <summary>
    /// Serializes the document back to the process file, preserving the source file's encoding
    /// (UTF-8, BOM iff the source had one), newline style and trailing-newline presence.
    /// </summary>
    public async Task Write()
    {
        var settings = new XmlWriterSettings
        {
            Async = true,
            OmitXmlDeclaration = false,
            Indent = true,
            // Keep the source newline style rather than the platform default, so the rewrite does
            // not churn every line ending of the file.
            NewLineChars = _newline,
            // Only emit a UTF-8 BOM if the source file had one, so the rewrite does not change encoding.
            Encoding = new UTF8Encoding(encoderShouldEmitUTF8Identifier: _sourceHadBom),
        };

        using var buffer = new MemoryStream();
        await using (var writer = XmlWriter.Create(buffer, settings))
        {
            await _doc.WriteToAsync(writer, CancellationToken.None);
        }

        // XmlWriter does not end the document with a newline; restore it if the source had one.
        if (_hadTrailingNewline)
            await buffer.WriteAsync(Encoding.UTF8.GetBytes(_newline));

        await File.WriteAllBytesAsync(_processFile, buffer.ToArray());
    }
}
