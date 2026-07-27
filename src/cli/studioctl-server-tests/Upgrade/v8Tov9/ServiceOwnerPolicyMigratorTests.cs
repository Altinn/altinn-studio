using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.PolicyMigration;
using static Studioctl.Tests.Upgrade.v8Tov9.PolicyXmlBuilder;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class ServiceOwnerPolicyMigratorTests : IDisposable
{
    private const string Metadata = """{"id":"ttd/myapp","org":"ttd"}""";

    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private async Task<MigrationResult> MigrateResult(string policy, string? metadata = Metadata)
    {
        _app.Write("config/authorization/policy.xml", policy);
        if (metadata is not null)
            _app.Write("config/applicationmetadata.json", metadata);

        var migrator = new ServiceOwnerPolicyMigrator(_app.Root);
        return await migrator.Migrate();
    }

    private async Task<IReadOnlyList<string>> Migrate(string policy, string? metadata = Metadata) =>
        (await MigrateResult(policy, metadata)).Warnings;

    private string PolicyAfter() => _app.Read("config/authorization/policy.xml");

    [Fact]
    public async Task StandardTemplateShape_NothingMissing_InsertsNothing()
    {
        // Org has instantiate+read (rule 1), write in any state (rule 4), complete at the end event
        // (rule 5) - the standard Studio template shape. The end-event-scoped complete grant only
        // counts because the process actually has that end event.
        var policy = Policy(
            Rule(
                "1",
                AnyOf(AllOf(SubjectRole("dagl")), AllOf(SubjectOrg("ttd"))),
                AnyOf(AllOf(ResourceOrg("ttd"), ResourceApp("myapp"))),
                AnyOf(AllOf(Action("instantiate")), AllOf(Action("read")))
            ),
            Rule(
                "4",
                AnyOf(AllOf(SubjectOrg("ttd"))),
                AnyOf(AllOf(ResourceOrg("ttd"), ResourceApp("myapp"))),
                AnyOf(AllOf(Action("write")))
            ),
            Rule(
                "5",
                AnyOf(AllOf(SubjectOrg("ttd"))),
                AnyOf(AllOf(ResourceOrg("ttd"), ResourceApp("myapp"), ResourceEndEvent("EndEvent_1"))),
                AnyOf(AllOf(Action("complete")))
            )
        );
        _app.Write(
            "config/process/process.bpmn",
            BpmnBuilder.Process(
                BpmnBuilder.Task("Task_1", "data"),
                BpmnBuilder.Flow("Flow_end", "Task_1", "EndEvent_1"),
                BpmnBuilder.EndEvent("EndEvent_1")
            )
        );

        var result = await MigrateResult(policy);

        Assert.Empty(result.Warnings);
        Assert.False(result.ManualActionRequired);
        Assert.Equal(policy, PolicyAfter());
    }

    [Fact]
    public async Task DefaultStudioTemplatePolicy_NeedsNoMigration()
    {
        // A freshly-scaffolded app ships with the default Studio template, whose org rule already
        // grants read/write/complete (via the [ORG]/[APP] placeholders). The migrator must recognise
        // that and leave the file completely untouched. The fixture is a verbatim copy of
        // src/App/template/src/App/config/authorization/policy.xml.
        var policy = await File.ReadAllTextAsync(
            Path.Combine(AppContext.BaseDirectory, "Upgrade/v8Tov9/TestData/template-policy.xml"),
            TestContext.Current.CancellationToken
        );

        var result = await MigrateResult(policy, metadata: null);

        Assert.Empty(result.Warnings);
        Assert.False(result.ManualActionRequired);
        Assert.Equal(policy, PolicyAfter());
    }

    [Fact]
    public async Task ActionsSplitAcrossAllOfsInOneAnyOf_AreNotMisreadAsOrgGrants()
    {
        // XACML semantics: within one AnyOf, subject and action pair up per AllOf. The org only has
        // 'instantiate' here; read/write/complete belong to a role. A matcher that flattens the rule
        // would wrongly conclude the org already has them.
        var policy = Policy(
            Rule(
                "1",
                AnyOf(
                    AllOf(SubjectOrg("ttd"), Action("instantiate")),
                    AllOf(SubjectRole("dagl"), Action("read")),
                    AllOf(SubjectRole("dagl"), Action("write")),
                    AllOf(SubjectRole("dagl"), Action("complete"))
                ),
                AnyOf(AllOf(ResourceOrg("ttd"), ResourceApp("myapp")))
            )
        );

        var warnings = await Migrate(policy);

        Assert.Contains(warnings, w => w.Contains("[read, write, complete]", StringComparison.Ordinal));
        Assert.Contains("v8 to v9 upgrade", PolicyAfter(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task PolicyLeadingWithForeignOrgRule_InsertedRuleNamesTheAppOwner()
    {
        // The first urn:altinn:org resource match in document order belongs to another org; the
        // inserted rule must name the app's own org (from applicationmetadata.json), not that one.
        var policy = Policy(
            Rule(
                "1",
                AnyOf(AllOf(SubjectOrg("brg"))),
                AnyOf(AllOf(ResourceOrg("brg"), ResourceApp("their-app"))),
                AnyOf(AllOf(Action("read")))
            ),
            Rule(
                "2",
                AnyOf(AllOf(SubjectRole("dagl"))),
                AnyOf(AllOf(ResourceOrg("ttd"), ResourceApp("myapp"))),
                AnyOf(AllOf(Action("read")), AllOf(Action("write")))
            )
        );

        var warnings = await Migrate(policy);

        Assert.Contains(
            warnings,
            w => w.Contains("'ttd'", StringComparison.Ordinal) && w.Contains("ttd/myapp", StringComparison.Ordinal)
        );
        Assert.Contains("gives the app owner ttd", PolicyAfter(), StringComparison.Ordinal);
        Assert.DoesNotContain("gives the app owner brg", PolicyAfter(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task PlaceholderPolicy_InsertedRuleUsesPlaceholders()
    {
        // Studio templates use [ORG]/[APP], substituted at deploy time. The inserted rule must follow
        // the file's convention even when applicationmetadata.json has concrete values.
        var policy = Policy(
            Rule(
                "1",
                AnyOf(AllOf(SubjectOrg("[ORG]"))),
                AnyOf(AllOf(ResourceOrg("[ORG]"), ResourceApp("[APP]"))),
                AnyOf(AllOf(Action("instantiate")), AllOf(Action("read")))
            )
        );

        var warnings = await Migrate(policy);

        Assert.Contains(warnings, w => w.Contains("[write, complete]", StringComparison.Ordinal));
        Assert.Contains("gives the app owner [ORG]", PolicyAfter(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task TaskScopedGrant_DoesNotCountAsStateIndependentBaseline()
    {
        var policy = Policy(
            Rule(
                "1",
                AnyOf(AllOf(SubjectOrg("ttd"))),
                AnyOf(AllOf(ResourceOrg("ttd"), ResourceApp("myapp"), ResourceTask("Task_1"))),
                AnyOf(AllOf(Action("read")), AllOf(Action("write")), AllOf(Action("complete")))
            )
        );

        var warnings = await Migrate(policy);

        Assert.Contains(warnings, w => w.Contains("[read, write, complete]", StringComparison.Ordinal));
    }

    [Fact]
    public async Task RuleWithCondition_IsNotTrustedAsAGrant()
    {
        var policy = Policy(
            "  <xacml:Rule RuleId=\"urn:altinn:example:ruleid:1\" Effect=\"Permit\">\n"
                + "    <xacml:Target>\n"
                + AnyOf(AllOf(SubjectOrg("ttd")))
                + "\n"
                + AnyOf(AllOf(ResourceOrg("ttd"), ResourceApp("myapp")))
                + "\n"
                + AnyOf(AllOf(Action("read")), AllOf(Action("write")), AllOf(Action("complete")))
                + "\n    </xacml:Target>\n"
                + "    <xacml:Condition>\n"
                + "      <xacml:Apply FunctionId=\"urn:oasis:names:tc:xacml:1.0:function:string-equal\">\n"
                + "        <xacml:AttributeValue DataType=\"http://www.w3.org/2001/XMLSchema#string\">x</xacml:AttributeValue>\n"
                + "        <xacml:AttributeValue DataType=\"http://www.w3.org/2001/XMLSchema#string\">y</xacml:AttributeValue>\n"
                + "      </xacml:Apply>\n"
                + "    </xacml:Condition>\n"
                + "  </xacml:Rule>"
        );

        var warnings = await Migrate(policy);

        Assert.Contains(warnings, w => w.Contains("[read, write, complete]", StringComparison.Ordinal));
    }

    [Fact]
    public async Task WithoutApplicationMetadata_FallsBackToPolicyValues()
    {
        var policy = Policy(
            Rule(
                "1",
                AnyOf(AllOf(SubjectOrg("ttd"))),
                AnyOf(AllOf(ResourceOrg("ttd"), ResourceApp("myapp"))),
                AnyOf(AllOf(Action("instantiate")))
            )
        );

        var warnings = await Migrate(policy, metadata: null);

        Assert.Contains(warnings, w => w.Contains("'ttd'", StringComparison.Ordinal));
        Assert.Contains("gives the app owner ttd", PolicyAfter(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task SecondRun_IsIdempotent()
    {
        var policy = Policy(
            Rule(
                "1",
                AnyOf(AllOf(SubjectOrg("ttd"))),
                AnyOf(AllOf(ResourceOrg("ttd"), ResourceApp("myapp"))),
                AnyOf(AllOf(Action("instantiate")))
            )
        );

        var firstWarnings = await Migrate(policy);
        var afterFirst = PolicyAfter();

        var secondWarnings = (await new ServiceOwnerPolicyMigrator(_app.Root).Migrate()).Warnings;

        Assert.Contains(firstWarnings, w => w.Contains("Added a policy rule", StringComparison.Ordinal));
        Assert.DoesNotContain(secondWarnings, w => w.Contains("Added a policy rule", StringComparison.Ordinal));
        Assert.Equal(afterFirst, PolicyAfter());
    }

    [Fact]
    public async Task InsertedRuleContinuesTheRuleIdSequence()
    {
        var policy = Policy(
            Rule(
                "7",
                AnyOf(AllOf(SubjectOrg("ttd"))),
                AnyOf(AllOf(ResourceOrg("ttd"), ResourceApp("myapp"))),
                AnyOf(AllOf(Action("instantiate")))
            )
        );

        await Migrate(policy);

        Assert.Contains("urn:altinn:example:ruleid:8", PolicyAfter(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task BomIsPreserved()
    {
        var policy = Policy(
            Rule(
                "1",
                AnyOf(AllOf(SubjectOrg("ttd"))),
                AnyOf(AllOf(ResourceOrg("ttd"), ResourceApp("myapp"))),
                AnyOf(AllOf(Action("instantiate")))
            )
        );
        _app.WriteBytes(
            "config/authorization/policy.xml",
            [0xEF, 0xBB, 0xBF, .. System.Text.Encoding.UTF8.GetBytes(policy)]
        );
        _app.Write("config/applicationmetadata.json", Metadata);

        await new ServiceOwnerPolicyMigrator(_app.Root).Migrate();

        var bytes = _app.ReadBytes("config/authorization/policy.xml");
        Assert.True(bytes is [0xEF, 0xBB, 0xBF, ..], "expected the UTF-8 BOM to be preserved");
        Assert.Contains("v8 to v9 upgrade", PolicyAfter(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task TaskSpecificActions_MissingGrantsAreWarnedAbout()
    {
        // Org has the baseline (unscoped read/write/complete) but the process contains a signing
        // task, whose transitions replay with sign/reject.
        var policy = Policy(
            Rule(
                "1",
                AnyOf(AllOf(SubjectOrg("ttd"))),
                AnyOf(AllOf(ResourceOrg("ttd"), ResourceApp("myapp"))),
                AnyOf(AllOf(Action("read")), AllOf(Action("write")), AllOf(Action("complete")))
            )
        );
        _app.Write(
            "config/process/process.bpmn",
            BpmnBuilder.Process(
                BpmnBuilder.Task("Task_1", "data"),
                BpmnBuilder.Task("Task_2", "signing"),
                BpmnBuilder.Flow("Flow_1", "Task_1", "Task_2")
            )
        );

        var warnings = await Migrate(policy);

        Assert.Contains(
            warnings,
            w => w.Contains("'sign'", StringComparison.Ordinal) && w.Contains("'reject'", StringComparison.Ordinal)
        );
    }

    [Fact]
    public async Task NonUtf8Policy_IsRefusedAndLeftByteIdentical()
    {
        // A legacy-encoded policy must not be decoded lossily and rewritten: that would permanently
        // replace the non-ASCII content with U+FFFD.
        var policy = Policy(
            Rule(
                "1",
                AnyOf(AllOf(SubjectRole("dæglig"))),
                AnyOf(AllOf(ResourceOrg("ttd"), ResourceApp("myapp"))),
                AnyOf(AllOf(Action("read")))
            )
        );
        _app.WriteBytes("config/authorization/policy.xml", System.Text.Encoding.Latin1.GetBytes(policy));
        _app.Write("config/applicationmetadata.json", Metadata);
        var bytesBefore = _app.ReadBytes("config/authorization/policy.xml");

        var warnings = (await new ServiceOwnerPolicyMigrator(_app.Root).Migrate()).Warnings;

        Assert.Contains(warnings, w => w.Contains("not valid UTF-8", StringComparison.Ordinal));
        Assert.Equal(bytesBefore, _app.ReadBytes("config/authorization/policy.xml"));
    }

    [Fact]
    public async Task InsertionPointInsideComment_IsCaughtAndFileLeftUnchanged()
    {
        // The line-based insertion point matcher can land inside a commented-out block (valid XML,
        // dead rule); the migrator must detect that the rule did not become a real element and bail.
        var policy = Policy(
            Rule(
                "1",
                AnyOf(AllOf(SubjectRole("dagl"))),
                AnyOf(AllOf(ResourceOrg("ttd"), ResourceApp("myapp"))),
                AnyOf(AllOf(Action("read")))
            ),
            "  <!-- disabled while testing:\n"
                + "  <xacml:ObligationExpressions>\n"
                + "  </xacml:ObligationExpressions>\n"
                + "  -->"
        );

        var warnings = await Migrate(policy);

        Assert.Contains(warnings, w => w.Contains("inside a comment", StringComparison.Ordinal));
        Assert.DoesNotContain(warnings, w => w.Contains("Added a policy rule", StringComparison.Ordinal));
        Assert.Equal(policy, PolicyAfter());
    }

    [Fact]
    public async Task DenyRulePresent_AnalysisIsInconclusive_NoRuleInserted()
    {
        // With Deny rules (and a deny-overrides combining algorithm) a Permit we find may still be
        // overridden, so "already granted" conclusions are unreliable in both directions.
        var denyRule =
            "  <xacml:Rule RuleId=\"urn:altinn:example:ruleid:2\" Effect=\"Deny\">\n"
            + "    <xacml:Target>\n"
            + AnyOf(AllOf(Action("write")))
            + "\n    </xacml:Target>\n"
            + "  </xacml:Rule>";
        var policy = Policy(
            Rule(
                "1",
                AnyOf(AllOf(SubjectOrg("ttd"))),
                AnyOf(AllOf(ResourceOrg("ttd"), ResourceApp("myapp"))),
                AnyOf(AllOf(Action("read")), AllOf(Action("write")), AllOf(Action("complete")))
            ),
            denyRule
        );

        var result = await MigrateResult(policy);

        Assert.True(result.ManualActionRequired);
        Assert.Contains(
            result.Warnings,
            w =>
                w.Contains("Deny rule", StringComparison.Ordinal)
                && w.Contains("inconclusive", StringComparison.Ordinal)
                && w.Contains("[read, write, complete]", StringComparison.Ordinal)
        );
        Assert.DoesNotContain(result.Warnings, w => w.Contains("Added a policy rule", StringComparison.Ordinal));
        Assert.Equal(policy, PolicyAfter());
    }

    [Fact]
    public async Task EndEventScopedComplete_NamingAnUnknownEndEvent_DoesNotCount()
    {
        // A complete grant scoped to an end event the process does not have (e.g. renamed) can never
        // match a real request, so complete is still missing.
        var policy = Policy(
            Rule(
                "1",
                AnyOf(AllOf(SubjectOrg("ttd"))),
                AnyOf(AllOf(ResourceOrg("ttd"), ResourceApp("myapp"))),
                AnyOf(AllOf(Action("read")), AllOf(Action("write")))
            ),
            Rule(
                "2",
                AnyOf(AllOf(SubjectOrg("ttd"))),
                AnyOf(AllOf(ResourceOrg("ttd"), ResourceApp("myapp"), ResourceEndEvent("EndEvent_99"))),
                AnyOf(AllOf(Action("complete")))
            )
        );
        _app.Write(
            "config/process/process.bpmn",
            BpmnBuilder.Process(
                BpmnBuilder.Task("Task_1", "data"),
                BpmnBuilder.Flow("Flow_end", "Task_1", "EndEvent_1"),
                BpmnBuilder.EndEvent("EndEvent_1")
            )
        );

        var warnings = await Migrate(policy);

        Assert.Contains(
            warnings,
            w =>
                w.Contains("Added a policy rule", StringComparison.Ordinal)
                && w.Contains("[complete]", StringComparison.Ordinal)
        );
    }

    [Fact]
    public async Task SignGrantScopedToANonSigningTask_DoesNotSatisfyTheSigningTask()
    {
        var policy = Policy(
            Rule(
                "1",
                AnyOf(AllOf(SubjectOrg("ttd"))),
                AnyOf(AllOf(ResourceOrg("ttd"), ResourceApp("myapp"))),
                AnyOf(AllOf(Action("read")), AllOf(Action("write")), AllOf(Action("complete")))
            ),
            Rule(
                "2",
                AnyOf(AllOf(SubjectOrg("ttd"))),
                AnyOf(AllOf(ResourceOrg("ttd"), ResourceApp("myapp"), ResourceTask("Task_1"))),
                AnyOf(AllOf(Action("sign")), AllOf(Action("reject")))
            )
        );
        _app.Write(
            "config/process/process.bpmn",
            BpmnBuilder.Process(
                BpmnBuilder.Task("Task_1", "data"),
                BpmnBuilder.Task("Task_2", "signing"),
                BpmnBuilder.Flow("Flow_1", "Task_1", "Task_2")
            )
        );

        var warnings = await Migrate(policy);

        Assert.Contains(warnings, w => w.Contains("'sign'", StringComparison.Ordinal));
    }

    [Fact]
    public async Task SignGrantScopedToTheSigningTask_Satisfies()
    {
        var policy = Policy(
            Rule(
                "1",
                AnyOf(AllOf(SubjectOrg("ttd"))),
                AnyOf(AllOf(ResourceOrg("ttd"), ResourceApp("myapp"))),
                AnyOf(AllOf(Action("read")), AllOf(Action("write")), AllOf(Action("complete")))
            ),
            Rule(
                "2",
                AnyOf(AllOf(SubjectOrg("ttd"))),
                AnyOf(AllOf(ResourceOrg("ttd"), ResourceApp("myapp"), ResourceTask("Task_2"))),
                AnyOf(AllOf(Action("sign")), AllOf(Action("reject")))
            )
        );
        _app.Write(
            "config/process/process.bpmn",
            BpmnBuilder.Process(
                BpmnBuilder.Task("Task_1", "data"),
                BpmnBuilder.Task("Task_2", "signing"),
                BpmnBuilder.Flow("Flow_1", "Task_1", "Task_2")
            )
        );

        var warnings = await Migrate(policy);

        Assert.Empty(warnings);
    }

    [Fact]
    public async Task ConfirmationTask_WarnsOnlyAboutConfirm()
    {
        // Confirmation tasks advance with 'confirm' only (see ProcessEngineAuthorizer); warning
        // about 'reject' for them would be noise.
        var policy = Policy(
            Rule(
                "1",
                AnyOf(AllOf(SubjectOrg("ttd"))),
                AnyOf(AllOf(ResourceOrg("ttd"), ResourceApp("myapp"))),
                AnyOf(AllOf(Action("read")), AllOf(Action("write")), AllOf(Action("complete")))
            )
        );
        _app.Write(
            "config/process/process.bpmn",
            BpmnBuilder.Process(
                BpmnBuilder.Task("Task_1", "data"),
                BpmnBuilder.Task("Task_2", "confirmation"),
                BpmnBuilder.Flow("Flow_1", "Task_1", "Task_2")
            )
        );

        var warnings = await Migrate(policy);

        Assert.Contains(warnings, w => w.Contains("'confirm'", StringComparison.Ordinal));
        Assert.DoesNotContain(warnings, w => w.Contains("'reject'", StringComparison.Ordinal));
    }
}
