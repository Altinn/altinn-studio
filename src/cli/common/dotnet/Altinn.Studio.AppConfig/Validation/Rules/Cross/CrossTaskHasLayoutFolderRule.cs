using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Validation.Rules.Cross;

internal sealed class CrossTaskHasLayoutFolderRule : IValidationRule
{
    public RuleMetadata Metadata { get; } =
        new(
            "CROSS-TASK-HAS-LAYOUT-FOLDER",
            "Every BPMN data task must have a layout folder",
            "The frontend renders a data task from the folder under App/ui/ named after the task "
                + "id, so a data task without one renders nothing. An app with no folder for any "
                + "task, no CustomReceipt and no unused folder has no UI for its process (an API-only "
                + "or stateless-only app) and is not checked, and neither is a task that no path of "
                + "sequence flows from a start event reaches. Unused folders are named as rename "
                + "candidates here instead of being reported by UNUSED-LAYOUT-FOLDER.",
            Severity.Error
        );

    public IEnumerable<Finding> Check(AppModel app)
    {
        var tasks = DataTasksWithoutFolder(app);
        if (tasks.Count == 0)
            yield break;
        var unusedFolders = app
            .LayoutSets.Where(s => app.FolderRole(s) == LayoutFolderRole.Unused)
            .Select(s => s.Id)
            .ToList();
        foreach (var task in tasks)
            yield return Metadata.Report(Message(task.Id, unusedFolders), task.Position);
    }

    internal static IReadOnlyList<ProcessTask> DataTasksWithoutFolder(AppModel app)
    {
        var processHasUi = app.LayoutSets.Any(s =>
            app.FolderRole(s) is LayoutFolderRole.Task or LayoutFolderRole.Receipt or LayoutFolderRole.Unused
        );
        if (!processHasUi)
            return [];
        return app
            .Tasks.Where(t => t.TaskType == ProcessTaskTypes.Data && t.Reachable && app.LayoutSetForTask(t.Id) is null)
            .ToList();
    }

    private static string Message(string taskId, List<string> unusedFolders)
    {
        var message =
            $"BPMN data task \"{taskId}\" has no layout folder App/ui/{taskId}/ — the frontend renders nothing for it";
        return unusedFolders.Count switch
        {
            0 => message,
            1 => $"{message}; if the unused folder \"{unusedFolders[0]}\" holds its pages, rename it to \"{taskId}\"",
            _ =>
                $"{message}; if one of the unused folders {string.Join(", ", unusedFolders.Select(f => $"\"{f}\""))} holds its pages, rename it to \"{taskId}\"",
        };
    }
}
