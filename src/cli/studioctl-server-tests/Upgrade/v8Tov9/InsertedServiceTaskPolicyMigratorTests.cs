using System.Text;
using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.PolicyMigration;
using static Studioctl.Tests.Upgrade.v8Tov9.PolicyXmlBuilder;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class InsertedServiceTaskPolicyMigratorTests : IDisposable
{
    private const string PolicyPath = "config/authorization/policy.xml";

    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    /// <summary>Task_1 followed by both inserted service tasks, then Task_2 and the end event.</summary>
    private static string ProcessWithInsertedTasks(bool withEFormidling = true) =>
        BpmnBuilder.Process(
            BpmnBuilder.StartEvent("StartEvent_1"),
            BpmnBuilder.Task("Task_1", "data"),
            BpmnBuilder.PdfServiceTask("PdfTask_Task_1"),
            withEFormidling ? BpmnBuilder.ServiceTask("EFormidlingTask_Task_1", "eFormidling") : "",
            BpmnBuilder.Task("Task_2", "data"),
            BpmnBuilder.EndEvent("EndEvent_1"),
            BpmnBuilder.Flow("Flow_1", "StartEvent_1", "Task_1"),
            BpmnBuilder.Flow("Flow_2", "Task_1", "PdfTask_Task_1"),
            withEFormidling
                ? BpmnBuilder.Flow("Flow_3", "PdfTask_Task_1", "EFormidlingTask_Task_1")
                    + "\n"
                    + BpmnBuilder.Flow("Flow_4", "EFormidlingTask_Task_1", "Task_2")
                : BpmnBuilder.Flow("Flow_3", "PdfTask_Task_1", "Task_2"),
            BpmnBuilder.Flow("Flow_5", "Task_2", "EndEvent_1")
        );

    private async Task<MigrationResult> Migrate(string policy, string? process = null)
    {
        _app.Write(PolicyPath, policy);
        _app.Write("config/process/process.bpmn", process ?? ProcessWithInsertedTasks());
        return await new InsertedServiceTaskPolicyMigrator(_app.Root).Migrate();
    }

    private static string Users() => AnyOf(AllOf(SubjectRole("dagl")), AllOf(SubjectRole("priv")));

    private static string TaskResource(string task, string org = "ttd", string app = "myapp") =>
        AllOf(ResourceOrg(org), ResourceApp(app), ResourceTask(task));

    private static string EndEventResource(string endEvent) =>
        AllOf(ResourceOrg("ttd"), ResourceApp("myapp"), ResourceEndEvent(endEvent));

    private static string AppResource() => AnyOf(AllOf(ResourceOrg("ttd"), ResourceApp("myapp")));

    private static string Actions(params string[] actions) => AnyOf([.. actions.Select(a => AllOf(Action(a)))]);

    /// <summary>The service-owner rule every policy has; it never counts as user access.</summary>
    private static string OrgRule(string id) =>
        Rule(id, AnyOf(AllOf(SubjectOrg("ttd"))), AppResource(), Actions("read", "write", "complete"));

    /// <summary>A rule as the migration adds it, with its description.</summary>
    private static string AddedRule(string id, string sourceRuleId, string actions, params string[] anyOfs) =>
        $"  <xacml:Rule RuleId=\"urn:altinn:example:ruleid:{id}\" Effect=\"Permit\">\n"
        + "    <xacml:Description>Rule added by the v8 to v9 upgrade: gives the subjects of rule "
        + $"urn:altinn:example:ruleid:{sourceRuleId} the right to {actions} in the service tasks the upgrade "
        + "inserted after a task that rule covers.</xacml:Description>\n"
        + "    <xacml:Target>\n"
        + string.Join("\n", anyOfs)
        + "\n    </xacml:Target>\n"
        + "  </xacml:Rule>";

    private static string InsertedTasks(string org = "ttd", string app = "myapp") =>
        AnyOf(TaskResource("PdfTask_Task_1", org, app), TaskResource("EFormidlingTask_Task_1", org, app));

    [Fact]
    public async Task TaskScopedUserRules_GetANewRuleForTheInsertedTasks()
    {
        var policy = Policy(
            OrgRule("1"),
            Rule("2", Users(), AnyOf(TaskResource("Task_1"), EndEventResource("EndEvent_1")), Actions("read", "write")),
            Rule("3", Users(), AnyOf(TaskResource("Task_2")), Actions("read", "write")),
            // A service owner's task-scoped rule is the service-owner migration's concern.
            Rule("4", AnyOf(AllOf(SubjectOrg("ttd"))), AnyOf(TaskResource("Task_1")), Actions("read"))
        );

        var result = await Migrate(policy);

        var expected = Policy(
            OrgRule("1"),
            Rule("2", Users(), AnyOf(TaskResource("Task_1"), EndEventResource("EndEvent_1")), Actions("read", "write")),
            Rule("3", Users(), AnyOf(TaskResource("Task_2")), Actions("read", "write")),
            Rule("4", AnyOf(AllOf(SubjectOrg("ttd"))), AnyOf(TaskResource("Task_1")), Actions("read")),
            AddedRule("5", "2", "read, write", Users(), InsertedTasks(), Actions("read", "write"))
        );
        Assert.Equal(expected, _app.Read(PolicyPath));
        Assert.Empty(result.Todos);
        var warning = Assert.Single(result.Warnings);
        Assert.Contains(
            "added rule urn:altinn:example:ruleid:5 giving the subjects of rule urn:altinn:example:ruleid:2 "
                + "read, write on PdfTask_Task_1, EFormidlingTask_Task_1",
            warning,
            StringComparison.Ordinal
        );
    }

    [Fact]
    public async Task AppLevelUserReadAndWrite_LeavesThePolicyUnchanged()
    {
        var policy = Policy(
            Rule("1", Users(), AppResource(), Actions("read", "write", "instantiate")),
            OrgRule("2"),
            Rule("3", Users(), AnyOf(TaskResource("Task_1")), Actions("read", "write", "confirm"))
        );

        var result = await Migrate(policy);

        Assert.Empty(result.Messages);
        Assert.Equal(policy, _app.Read(PolicyPath));
    }

    [Fact]
    public async Task DefaultStudioTemplatePolicy_IsLeftUnchanged()
    {
        var policy = await File.ReadAllTextAsync(
            Path.Combine(AppContext.BaseDirectory, "Upgrade/v8Tov9/TestData/template-policy.xml"),
            TestContext.Current.CancellationToken
        );

        var result = await Migrate(policy);

        Assert.Empty(result.Messages);
        Assert.Equal(policy, _app.Read(PolicyPath));
    }

    [Fact]
    public async Task OnlyWriteIsTaskScoped_NewRuleGrantsOnlyWrite()
    {
        var policy = Policy(
            Rule("1", Users(), AppResource(), Actions("read", "instantiate")),
            Rule("2", Users(), AnyOf(TaskResource("Task_1")), Actions("read", "write"))
        );

        var result = await Migrate(policy, ProcessWithInsertedTasks(withEFormidling: false));

        var expected = Policy(
            Rule("1", Users(), AppResource(), Actions("read", "instantiate")),
            Rule("2", Users(), AnyOf(TaskResource("Task_1")), Actions("read", "write")),
            AddedRule("3", "2", "write", Users(), AnyOf(TaskResource("PdfTask_Task_1")), Actions("write"))
        );
        Assert.Equal(expected, _app.Read(PolicyPath));
        var warning = Assert.Single(result.Warnings);
        Assert.Contains(
            "added rule urn:altinn:example:ruleid:3 giving the subjects of rule urn:altinn:example:ruleid:2 "
                + "write on PdfTask_Task_1",
            warning,
            StringComparison.Ordinal
        );
    }

    [Fact]
    public async Task RuleWithOtherActions_NewRuleGrantsOnlyReadAndWrite()
    {
        var policy = Policy(
            Rule("1", Users(), AnyOf(TaskResource("Task_1")), Actions("read", "write", "confirm")),
            OrgRule("2")
        );

        var result = await Migrate(policy);

        var expected = Policy(
            Rule("1", Users(), AnyOf(TaskResource("Task_1")), Actions("read", "write", "confirm")),
            OrgRule("2"),
            AddedRule("3", "1", "read, write", Users(), InsertedTasks(), Actions("read", "write"))
        );
        Assert.Equal(expected, _app.Read(PolicyPath));
        Assert.Single(result.Warnings);
        Assert.Empty(result.Todos);
    }

    [Fact]
    public async Task RuleOnOneLineWithPlaceholders_IsExtended()
    {
        // The new rule is generated, not copied, so the source rule's layout does not matter; its
        // org and app values are kept, so the [ORG]/[APP] placeholders survive.
        var oneLine = Rule("1", Users(), AnyOf(TaskResource("Task_1", "[ORG]", "[APP]")), Actions("read", "write"))
            .Replace("\n", "", StringComparison.Ordinal);
        var policy = Policy(oneLine);

        var result = await Migrate(policy);

        var expected = Policy(
            oneLine,
            AddedRule("2", "1", "read, write", Users(), InsertedTasks("[ORG]", "[APP]"), Actions("read", "write"))
        );
        Assert.Equal(expected, _app.Read(PolicyPath));
        Assert.Single(result.Warnings);
        Assert.Empty(result.Todos);
    }

    [Fact]
    public async Task SecondRun_ChangesNothingAndReportsNothing()
    {
        var policy = Policy(
            Rule("1", Users(), AnyOf(TaskResource("Task_1")), Actions("read", "write")),
            Rule("2", AnyOf(AllOf(SubjectRole("regna"))), AnyOf(TaskResource("Task_1")), Actions("read", "sign"))
        );
        await Migrate(policy);
        var afterFirst = _app.ReadBytes(PolicyPath);

        var second = await new InsertedServiceTaskPolicyMigrator(_app.Root).Migrate();

        Assert.Contains("PdfTask_Task_1", Encoding.UTF8.GetString(afterFirst), StringComparison.Ordinal);
        Assert.Contains("ruleid:3", Encoding.UTF8.GetString(afterFirst), StringComparison.Ordinal);
        Assert.Empty(second.Messages);
        Assert.Equal(afterFirst, _app.ReadBytes(PolicyPath));
    }

    [Fact]
    public async Task DenyRule_LeavesThePolicyUnchangedWithATodo()
    {
        var policy = Policy(
            Rule("1", Users(), AnyOf(TaskResource("Task_1")), Actions("read", "write")),
            "  <xacml:Rule RuleId=\"urn:altinn:example:ruleid:2\" Effect=\"Deny\">\n"
                + "    <xacml:Target>\n"
                + Actions("delete")
                + "\n    </xacml:Target>\n"
                + "  </xacml:Rule>"
        );

        var result = await Migrate(policy);

        var todo = Assert.Single(result.Todos);
        Assert.Contains("Deny rules", todo, StringComparison.Ordinal);
        Assert.Contains("Task_1 -> PdfTask_Task_1, EFormidlingTask_Task_1", todo, StringComparison.Ordinal);
        Assert.Empty(result.Warnings);
        Assert.Equal(policy, _app.Read(PolicyPath));
    }

    [Fact]
    public async Task Condition_LeavesThePolicyUnchangedWithATodo()
    {
        var policy = Policy(
            "  <xacml:Rule RuleId=\"urn:altinn:example:ruleid:1\" Effect=\"Permit\">\n"
                + "    <xacml:Target>\n"
                + Users()
                + "\n"
                + AnyOf(TaskResource("Task_1"))
                + "\n"
                + Actions("read", "write")
                + "\n    </xacml:Target>\n"
                + "    <xacml:Condition>\n"
                + "      <xacml:Apply FunctionId=\"urn:oasis:names:tc:xacml:1.0:function:string-equal\">\n"
                + "        <xacml:AttributeValue DataType=\"http://www.w3.org/2001/XMLSchema#string\">x</xacml:AttributeValue>\n"
                + "        <xacml:AttributeValue DataType=\"http://www.w3.org/2001/XMLSchema#string\">y</xacml:AttributeValue>\n"
                + "      </xacml:Apply>\n"
                + "    </xacml:Condition>\n"
                + "  </xacml:Rule>"
        );

        var result = await Migrate(policy);

        Assert.Contains(result.Todos, t => t.Contains("Condition", StringComparison.Ordinal));
        Assert.Empty(result.Warnings);
        Assert.Equal(policy, _app.Read(PolicyPath));
    }

    [Fact]
    public async Task TaskMatchOutsideAnOrgAndAppResource_LeavesThePolicyUnchangedWithATodo()
    {
        var policy = Policy(Rule("1", Users(), AnyOf(AllOf(ResourceTask("Task_1"))), Actions("read", "write")));

        var result = await Migrate(policy);

        Assert.Contains(result.Todos, t => t.Contains("outside an org and app resource", StringComparison.Ordinal));
        Assert.Equal(policy, _app.Read(PolicyPath));
    }

    [Fact]
    public async Task ProcessWithoutInsertedTasks_ReportsNothing()
    {
        var policy = Policy(Rule("1", Users(), AnyOf(TaskResource("Task_1")), Actions("read", "write")));
        var process = BpmnBuilder.Process(
            BpmnBuilder.Task("Task_1", "data"),
            BpmnBuilder.Flow("Flow_1", "Task_1", "EndEvent_1"),
            BpmnBuilder.EndEvent("EndEvent_1")
        );

        var result = await Migrate(policy, process);

        Assert.Empty(result.Messages);
        Assert.Equal(policy, _app.Read(PolicyPath));
    }

    [Fact]
    public async Task BomAndCrlf_ArePreserved()
    {
        var policy = Policy(Rule("1", Users(), AnyOf(TaskResource("Task_1")), Actions("read", "write")))
            .ReplaceLineEndings("\r\n");
        _app.WriteBytes(PolicyPath, [.. Encoding.UTF8.GetPreamble(), .. Encoding.UTF8.GetBytes(policy)]);
        _app.Write("config/process/process.bpmn", ProcessWithInsertedTasks());

        await new InsertedServiceTaskPolicyMigrator(_app.Root).Migrate();

        var expected = Policy(
                Rule("1", Users(), AnyOf(TaskResource("Task_1")), Actions("read", "write")),
                AddedRule("2", "1", "read, write", Users(), InsertedTasks(), Actions("read", "write"))
            )
            .ReplaceLineEndings("\r\n");
        Assert.Equal([.. Encoding.UTF8.GetPreamble(), .. Encoding.UTF8.GetBytes(expected)], _app.ReadBytes(PolicyPath));
    }

    [Fact]
    public async Task Upgrade_ExtendsRulesToTheEFormidlingTaskItInserts()
    {
        // The step must run after the eFormidling migration: run before it, there is no inserted
        // service task to extend the rule to.
        _app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <ItemGroup>
                <PackageReference Include="Altinn.App.Api" Version="8.6.5" />
                <PackageReference Include="Altinn.App.Core" Version="8.6.5" />
              </ItemGroup>
            </Project>
            """
        );
        _app.Write(
            "config/applicationmetadata.json",
            """
            {
              "id": "ttd/myapp",
              "org": "ttd",
              "eFormidling": {
                "receiver": "910075918",
                "sendAfterTaskId": "Task_1",
                "process": "urn:no:difi:profile:arkivmelding:administrasjon:ver1.0",
                "standard": "urn:no:difi:arkivmelding:xsd::arkivmelding",
                "typeVersion": "2.0",
                "type": "arkivmelding",
                "securityLevel": 3,
                "dataTypes": []
              },
              "dataTypes": []
            }
            """
        );
        _app.Write(
            "config/process/process.bpmn",
            BpmnBuilder.Process(
                BpmnBuilder.StartEvent("StartEvent_1"),
                BpmnBuilder.Task("Task_1", "data"),
                BpmnBuilder.EndEvent("EndEvent_1"),
                BpmnBuilder.Flow("Flow_start", "StartEvent_1", "Task_1"),
                BpmnBuilder.Flow("Flow_end", "Task_1", "EndEvent_1")
            )
        );
        _app.Write(
            PolicyPath,
            Policy(OrgRule("1"), Rule("2", Users(), AnyOf(TaskResource("Task_1")), Actions("read", "write")))
        );
        var report = new UpgradeReport();

        await V8Tov9Upgrade.RunAsync(
            new V8Tov9UpgradeOptions(
                ProjectFolder: _app.Root,
                ProjectFile: Path.Combine("App", "App.csproj"),
                TargetMajorVersion: 9,
                TargetFramework: "net10.0",
                SkipCsprojUpgrade: true,
                ConvertPackageReferences: false,
                StudioRoot: null,
                Report: report,
                Error: TextWriter.Null,
                CancellationToken: TestContext.Current.CancellationToken,
                SkipSemanticAnalysis: true
            )
        );

        Assert.Contains(
            AddedRule(
                "3",
                "2",
                "read, write",
                Users(),
                AnyOf(TaskResource("EFormidlingTask_Task_1")),
                Actions("read", "write")
            ),
            _app.Read(PolicyPath),
            StringComparison.Ordinal
        );
    }
}
