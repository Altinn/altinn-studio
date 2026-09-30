using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Validation;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class ProcessTaskTypeRuleTests
{
    private const string Rule = "PROCESS-TASK-TYPE";

    private static InMemoryAppDirectory App(string taskType, string code) =>
        new(
            new()
            {
                ["App/config/applicationmetadata.json"] = TestMeta.Json("ttd/tt"),
                ["App/config/process/process.bpmn"] = $"""
                <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:altinn="http://altinn.no/process">
                  <bpmn:process id="proc">
                    <bpmn:serviceTask id="Custom">
                      <bpmn:extensionElements><altinn:taskExtension><altinn:taskType>{taskType}</altinn:taskType></altinn:taskExtension></bpmn:extensionElements>
                    </bpmn:serviceTask>
                  </bpmn:process>
                </bpmn:definitions>
                """,
                ["App/logic/CustomTask.cs"] = code,
            }
        );

    private static IEnumerable<Finding> Findings(string taskType, string code) =>
        AppConfigEngine.Open(App(taskType, code)).Validate().Findings.Where(f => f.RuleId == Rule);

    [Theory]
    [InlineData(
        "sftp",
        """
            public class SftpTask : IServiceTask
            {
                public string Type => "sftp";
            }
            """
    )]
    [InlineData(
        "parallel_signing",
        """
            public class ParallelSigningTask : IProcessTask
            {
                public const string TaskId = "parallel_signing";
                public string Type { get; } = TaskId;
            }
            """
    )]
    [InlineData(
        "archive",
        """
            public class ArchiveTask : Altinn.App.Core.Features.Process.IPipelineServiceTask
            {
                internal const string Identifier = "archive";
                public string Type
                {
                    get { return Identifier; }
                }
            }
            """
    )]
    [InlineData(
        "notify",
        """
            public static class TaskTypes
            {
                public static readonly string Notify = "notify";
            }

            public sealed class NotifyTask(ILogger<NotifyTask> logger) : IServiceTask
            {
                string IProcessTask.Type => TaskTypes.Notify;
            }
            """
    )]
    public void TypeOfATaskClassInTheApp_IsAccepted(string taskType, string code)
    {
        Assert.Empty(Findings(taskType, code));
    }

    [Theory]
    [InlineData(
        "sftp",
        """
            public class SftpTask : IServiceTask
            {
                public string Type => "Sftp";
            }
            """
    )]
    [InlineData(
        "sftp",
        """
            public class SftpSettings
            {
                public string Type => "sftp";
            }
            """
    )]
    [InlineData(
        "sftp",
        """
            public class SftpTask : IServiceTask
            {
                public string Type => Settings.Current.Kind;
            }
            """
    )]
    public void TypeNotDeclaredByATaskClass_IsWarned(string taskType, string code)
    {
        var finding = Assert.Single(Findings(taskType, code));

        Assert.Contains($"\"{taskType}\"", finding.Message, StringComparison.Ordinal);
    }
}
