using Microsoft.CodeAnalysis;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration.ProcessHooks;

/// <summary>
/// v9 keeps <c>IProcessTask</c> but has no <c>Start</c>, <c>End</c> or <c>Abandon</c>: it runs the stages that
/// <c>DefineStart</c>, <c>DefineEnd</c> and <c>DefineAbandon</c> compose, none by default, so an app's v8
/// <c>(string taskId, Instance instance)</c> methods still compile and are never called. A method becomes the one stage
/// of its <c>Define</c> member; one that did nothing is deleted, and one that calls Storage is left to the Storage call
/// rewrite and reported, since nothing else would say it stopped running.
/// </summary>
internal static class ProcessTaskPort
{
    public static void Plan(
        IReadOnlyList<ScannedCSharpFile> files,
        StorageCallReach reach,
        IReadOnlyDictionary<IMethodSymbol, string> calls,
        PortEdits edits,
        List<PortReport> reports
    )
    {
        foreach (var hook in HookFamily.ProcessTaskMembers.SelectMany(family => HookImplementation.Find(family, files)))
        {
            if (hook.Declaration is not { } method)
            {
                continue;
            }

            var member = hook.Family.V8Member;
            var name = $"{hook.Type.Name}.{member}";
            if (HookMethodPort.BlockingReason(hook, calls) is { } reason)
            {
                reports.Add(
                    PortReport.Located(hook.File, method, UpgradeMessageStatus.Todo, NotCalled(name, member, reason))
                );
            }
            else if (HookMethodPort.DoesNothing(method, hook.Model))
            {
                edits.For(hook.File).RemoveLine(method);
                reports.Add(
                    PortReport.Located(
                        hook.File,
                        method,
                        UpgradeMessageStatus.Warning,
                        $"removed {name}, which did nothing; v9 never calls it, and Define{member} composes "
                            + "no stages by default."
                    )
                );
            }
            else if (reach.Reaches(hook.Method))
            {
                reports.Add(
                    PortReport.Located(
                        hook.File,
                        method,
                        UpgradeMessageStatus.Todo,
                        NotCalled(
                            name,
                            member,
                            "it calls Storage directly, which v9 refuses while the process is transitioning"
                        )
                    )
                );
            }
            else
            {
                var ported = HookMethodPort.Rewrite(
                    hook,
                    TaskIds.Every,
                    explicitFilter: false,
                    asPublicMethod: true,
                    SyntaxEditing.LineEnding(hook.File.Root)
                );
                var file = edits.For(hook.File);
                file.InsertBefore(
                    method,
                    ported.PrecedingMember ?? throw new InvalidOperationException("A stage has its Define member.")
                );
                file.Replace(method, ported.Rewritten);
                reports.Add(
                    PortReport.Located(
                        hook.File,
                        method,
                        UpgradeMessageStatus.Warning,
                        $"{name} now takes the StageContext v9 calls it with, as the stage of Define{member}. "
                            + HookMethodPort.RunsAgain
                    )
                );
            }
        }
    }

    private static string NotCalled(string name, string member, string reason) =>
        $"{name}(string taskId, Instance instance) is never called in v9 and was not moved: {reason}. Move it to "
        + $"a stage of Define{member}(PipelineBuilder pipeline), with instance data from the StageContext's "
        + "InstanceDataMutator.";
}
