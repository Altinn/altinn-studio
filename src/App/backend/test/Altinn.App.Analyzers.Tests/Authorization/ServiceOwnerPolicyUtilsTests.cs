using Altinn.App.Analyzers.Authorization;
using Altinn.App.Analyzers.Tests.Fixtures;
using Microsoft.CodeAnalysis;

namespace Altinn.App.Analyzers.Tests.Authorization;

public class ServiceOwnerPolicyUtilsTests
{
    private const string PolicyPath = "/repo/App/config/authorization/policy.xml";
    private const string ProcessPath = "/repo/App/config/process/process.bpmn";
    private const string MetadataPath = "/repo/App/config/applicationmetadata.json";

    private const string MissingGrant = "ALTINNAPP0800";
    private const string NotVerifiable = "ALTINNAPP0801";

    [Fact]
    public void Standard_Org_Rules_Satisfy_A_Data_Only_Process()
    {
        var diagnostics = Collect(
            PolicyFixtures.Policy(PolicyFixtures.StandardOrgRules),
            ProcessFixtures.Process(new ProcessTask("Task_1", "data"))
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public async Task Policy_Granting_Only_End_Users_Is_Missing_Read_And_Write()
    {
        var diagnostics = Collect(
            PolicyFixtures.Policy(PolicyFixtures.RoleRule("read", "write", "delete", "instantiate")),
            ProcessFixtures.Process(new ProcessTask("Task_1", "data"))
        );

        Assert.Equal(["read", "write"], Actions(diagnostics, MissingGrant));
        await Verify(diagnostics);
    }

    [Fact]
    public void Payment_And_Signing_Tasks_Need_Nothing_Beyond_Write()
    {
        // Storage authorizes both with 'pay'/'sign' OR 'write', so the baseline covers them. Demanding
        // 'pay' or 'sign' from the app owner would be a false positive.
        var diagnostics = Collect(
            PolicyFixtures.Policy(PolicyFixtures.StandardOrgRules),
            ProcessFixtures.Process(new ProcessTask("Task_1", "payment"), new ProcessTask("Task_2", "signing"))
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public async Task Confirmation_Task_Needs_Confirm_Which_Write_Does_Not_Cover()
    {
        var diagnostics = Collect(
            PolicyFixtures.Policy(PolicyFixtures.StandardOrgRules),
            ProcessFixtures.Process(new ProcessTask("Task_2", "confirmation"))
        );

        Assert.Equal(["confirm"], Actions(diagnostics, MissingGrant));
        await Verify(diagnostics);
    }

    [Fact]
    public void A_Confirm_Grant_Scoped_To_The_Confirmation_Task_Is_Enough()
    {
        var diagnostics = Collect(
            PolicyFixtures.Policy(PolicyFixtures.StandardOrgRules, PolicyFixtures.OrgRule(["confirm"], task: "Task_2")),
            ProcessFixtures.Process(new ProcessTask("Task_2", "confirmation"))
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public void A_Confirm_Grant_Scoped_To_Another_Task_Is_Not()
    {
        var diagnostics = Collect(
            PolicyFixtures.Policy(PolicyFixtures.StandardOrgRules, PolicyFixtures.OrgRule(["confirm"], task: "Task_9")),
            ProcessFixtures.Process(new ProcessTask("Task_2", "confirmation"))
        );

        Assert.Equal(["confirm"], Actions(diagnostics, MissingGrant));
    }

    [Fact]
    public void Custom_Task_Type_Needs_An_Action_Named_After_It()
    {
        var diagnostics = Collect(
            PolicyFixtures.Policy(PolicyFixtures.StandardOrgRules),
            ProcessFixtures.Process(new ProcessTask("Task_1", "pdfIfRequested"))
        );

        Assert.Equal(["pdfIfRequested"], Actions(diagnostics, MissingGrant));
    }

    [Fact]
    public async Task A_Task_Declaring_Reject_Needs_The_Reject_Action()
    {
        var diagnostics = Collect(
            PolicyFixtures.Policy(PolicyFixtures.StandardOrgRules),
            ProcessFixtures.Process(new ProcessTask("Task_2", "payment", Actions: ["confirm", "pay", "reject"]))
        );

        Assert.Equal(["reject"], Actions(diagnostics, MissingGrant));
        await Verify(diagnostics);
    }

    [Fact]
    public void A_Server_Action_Named_Reject_Is_Not_A_Process_Transition()
    {
        var diagnostics = Collect(
            PolicyFixtures.Policy(PolicyFixtures.StandardOrgRules),
            ProcessFixtures.Process(new ProcessTask("Task_1", "data", ServerActions: ["reject", "somethingElse"]))
        );

        Assert.Empty(diagnostics);
    }

    [Theory]
    [InlineData("eFormidling")]
    [InlineData("fiksArkiv")]
    public void Shipping_Task_Types_Need_Complete(string taskType)
    {
        var diagnostics = Collect(
            PolicyFixtures.Policy(PolicyFixtures.OrgRule(["read", "write"])),
            ProcessFixtures.Process(new ProcessTask("Task_2", taskType))
        );

        Assert.Equal(["complete"], Actions(diagnostics, MissingGrant));
    }

    [Fact]
    public void An_End_Event_Scoped_Complete_Grant_Covers_A_Shipping_Task()
    {
        // How the standard policy template grants it: 'complete' only happens at an end event.
        var diagnostics = Collect(
            PolicyFixtures.Policy(PolicyFixtures.StandardOrgRules),
            ProcessFixtures.Process(new ProcessTask("Task_2", "eFormidling"))
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public void A_Complete_Grant_Scoped_To_A_Nonexistent_End_Event_Does_Not()
    {
        var diagnostics = Collect(
            PolicyFixtures.Policy(
                PolicyFixtures.OrgRule(["read", "write"]),
                PolicyFixtures.OrgRule(["complete"], endEvent: "RenamedEndEvent")
            ),
            ProcessFixtures.Process(new ProcessTask("Task_2", "eFormidling"))
        );

        Assert.Equal(["complete"], Actions(diagnostics, MissingGrant));
    }

    [Fact]
    public async Task AutoDeleteOnProcessEnd_Needs_Delete()
    {
        var diagnostics = Collect(
            PolicyFixtures.Policy(PolicyFixtures.StandardOrgRules),
            ProcessFixtures.Process(new ProcessTask("Task_1", "data")),
            metadata: Metadata(autoDeleteOnProcessEnd: true)
        );

        Assert.Equal(["delete"], Actions(diagnostics, MissingGrant));
        await Verify(diagnostics);
    }

    [Fact]
    public void Deny_Rules_Make_The_Whole_Analysis_Inconclusive()
    {
        var diagnostics = Collect(
            PolicyFixtures.Policy(PolicyFixtures.RoleRule("read"), PolicyFixtures.OrgRule(["read"], effect: "Deny")),
            ProcessFixtures.Process(new ProcessTask("Task_1", "data"))
        );

        var diagnostic = Assert.Single(diagnostics);
        Assert.Equal(NotVerifiable, diagnostic.Id);
        Assert.Contains("Deny rules", diagnostic.GetMessage());
    }

    [Fact]
    public async Task A_Grant_Behind_A_Condition_Is_Inconclusive_Not_Missing()
    {
        var diagnostics = Collect(
            PolicyFixtures.Policy(PolicyFixtures.OrgRule(["read", "write"], condition: true)),
            ProcessFixtures.Process(new ProcessTask("Task_1", "data"))
        );

        Assert.All(diagnostics, d => Assert.Equal(NotVerifiable, d.Id));
        Assert.All(diagnostics, d => Assert.Equal(DiagnosticSeverity.Warning, d.Severity));
        await Verify(diagnostics);
    }

    [Fact]
    public void Baseline_Granted_Only_Per_Task_Is_Inconclusive_Not_Missing()
    {
        // The app reads and writes outside any task too, but a per-task grant might still cover
        // everything this particular app does - not something to fail a build over.
        var diagnostics = Collect(
            PolicyFixtures.Policy(PolicyFixtures.OrgRule(["read", "write"], task: "Task_1")),
            ProcessFixtures.Process(new ProcessTask("Task_1", "data"))
        );

        Assert.All(diagnostics, d => Assert.Equal(NotVerifiable, d.Id));
        Assert.Equal(["read", "write"], Actions(diagnostics, NotVerifiable));
    }

    [Fact]
    public void A_Case_Mismatched_Grant_Under_String_Equal_Does_Not_Satisfy()
    {
        // XACML's string-equal is case-sensitive, so Storage would reject this grant. Reading it
        // leniently would pass the build and leave the app to 403 at runtime - the very outcome this
        // rule exists to prevent.
        var diagnostics = Collect(
            PolicyFixtures.Policy(PolicyFixtures.OrgRule(["READ", "WRITE"], matchId: PolicyFixtures.StringEqual)),
            ProcessFixtures.Process(new ProcessTask("Task_1", "data"))
        );

        Assert.Equal(["read", "write"], Actions(diagnostics, MissingGrant));
    }

    [Fact]
    public void A_Case_Mismatched_Grant_Under_String_Equal_Ignore_Case_Does_Satisfy()
    {
        var diagnostics = Collect(
            PolicyFixtures.Policy(
                PolicyFixtures.OrgRule(["READ", "WRITE"], matchId: PolicyFixtures.StringEqualIgnoreCase)
            ),
            ProcessFixtures.Process(new ProcessTask("Task_1", "data"))
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public void An_Unmodelled_Match_Function_Is_Inconclusive_Not_Missing()
    {
        var diagnostics = Collect(
            PolicyFixtures.Policy(
                PolicyFixtures.OrgRule(
                    ["read", "write"],
                    matchId: "urn:oasis:names:tc:xacml:1.0:function:string-regexp-match"
                )
            ),
            ProcessFixtures.Process(new ProcessTask("Task_1", "data"))
        );

        Assert.All(diagnostics, d => Assert.Equal(NotVerifiable, d.Id));
    }

    [Fact]
    public void An_Unreadable_Policy_Is_Inconclusive()
    {
        var diagnostics = Collect("<xacml:Policy><not-closed>", ProcessFixtures.Process());

        var diagnostic = Assert.Single(diagnostics);
        Assert.Equal(NotVerifiable, diagnostic.Id);
    }

    [Fact]
    public void A_Policy_Element_Outside_The_Xacml_Namespace_Is_Inconclusive()
    {
        // Reading a non-XACML-3.0 document with XACML 3.0 element names is guesswork in both
        // directions: a document with no rules at all would look like a policy granting nothing,
        // and an XACML 2.0 policy (whose target is Subjects/Resources/Actions, not AnyOf) would look
        // like one whose every rule applies to every request.
        var diagnostics = Collect(
            """
            <?xml version="1.0" encoding="utf-8"?>
            <Policy xmlns="urn:example:not-xacml">
              <Rule Effect="Permit" />
            </Policy>
            """,
            ProcessFixtures.Process(new ProcessTask("Task_1", "data"))
        );

        var diagnostic = Assert.Single(diagnostics);
        Assert.Equal(NotVerifiable, diagnostic.Id);
    }

    [Fact]
    public void The_Xacml_Namespace_Is_Recognised_When_Declared_Without_A_Prefix()
    {
        // Only the namespace URI matters, not how a document happens to bind it.
        var policy = PolicyFixtures
            .Policy(PolicyFixtures.StandardOrgRules)
            .Replace("xmlns:xacml=", "xmlns=", StringComparison.Ordinal)
            .Replace("<xacml:", "<", StringComparison.Ordinal)
            .Replace("</xacml:", "</", StringComparison.Ordinal);

        var diagnostics = Collect(policy, ProcessFixtures.Process(new ProcessTask("Task_1", "data")));

        Assert.Empty(diagnostics);
    }

    [Fact]
    public void An_Org_Placeholder_Beside_A_Substituted_App_Value_Is_Still_Read_Correctly()
    {
        // A hand-edited policy can mix the two conventions. Treating them as a pair would compare
        // 'myapp' against '[APP]', fail the resource match, and report grants the policy plainly
        // makes as missing.
        var diagnostics = Collect(
            PolicyFixtures.Policy(PolicyFixtures.OrgRule(["read", "write"], org: "[ORG]", app: "myapp")),
            ProcessFixtures.Process(new ProcessTask("Task_1", "data")),
            metadata: Metadata(id: "ttd/myapp")
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public void An_App_Placeholder_Beside_A_Substituted_Org_Value_Is_Still_Read_Correctly()
    {
        var diagnostics = Collect(
            PolicyFixtures.Policy(PolicyFixtures.OrgRule(["read", "write"], org: "ttd", app: "[APP]")),
            ProcessFixtures.Process(new ProcessTask("Task_1", "data")),
            metadata: Metadata(id: "ttd/myapp")
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public void A_Task_Scope_Declared_With_An_Unmodelled_Match_Function_Is_Inconclusive()
    {
        // A regular-expression task match could well cover Task_2; this analysis cannot tell, so it
        // must not report the grant as missing.
        var diagnostics = Collect(
            PolicyFixtures.Policy(
                PolicyFixtures.StandardOrgRules,
                PolicyFixtures.OrgRule(
                    ["confirm"],
                    task: "Task_.*",
                    taskMatchId: "urn:oasis:names:tc:xacml:1.0:function:string-regexp-match"
                )
            ),
            ProcessFixtures.Process(new ProcessTask("Task_2", "confirmation"))
        );

        Assert.All(diagnostics, d => Assert.Equal(NotVerifiable, d.Id));
        Assert.Equal(["confirm"], Actions(diagnostics, NotVerifiable));
    }

    [Fact]
    public void An_End_Event_Scope_Declared_With_An_Unmodelled_Match_Function_Is_Inconclusive()
    {
        var diagnostics = Collect(
            PolicyFixtures.Policy(
                PolicyFixtures.OrgRule(["read", "write"]),
                PolicyFixtures.OrgRule(
                    ["complete"],
                    endEvent: "EndEvent.*",
                    endEventMatchId: "urn:oasis:names:tc:xacml:1.0:function:string-regexp-match"
                )
            ),
            ProcessFixtures.Process(new ProcessTask("Task_2", "eFormidling"))
        );

        Assert.All(diagnostics, d => Assert.Equal(NotVerifiable, d.Id));
        Assert.Equal(["complete"], Actions(diagnostics, NotVerifiable));
    }

    [Fact]
    public void Process_Elements_Outside_The_Altinn_And_Bpmn_Namespaces_Are_Ignored()
    {
        // Every element here has the right local name in the wrong namespace, so the app runtime
        // (which binds to these namespaces) reads none of it. Honouring it would invent a
        // 'someVendorType' requirement, a reject requirement and an end-event scope out of a vendor
        // extension.
        var diagnostics = Collect(
            PolicyFixtures.Policy(PolicyFixtures.OrgRule(["read", "write"])),
            """
            <?xml version="1.0" encoding="UTF-8"?>
            <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                              xmlns:altinn="http://altinn.no/process"
                              xmlns:foo="urn:example:vendor">
              <bpmn:process id="Process_1">
                <bpmn:task id="Task_1">
                  <bpmn:extensionElements>
                    <altinn:taskExtension>
                      <altinn:taskType>data</altinn:taskType>
                    </altinn:taskExtension>
                    <foo:taskExtension>
                      <foo:taskType>someVendorType</foo:taskType>
                      <foo:actions><foo:action>reject</foo:action></foo:actions>
                    </foo:taskExtension>
                  </bpmn:extensionElements>
                </bpmn:task>
                <foo:endEvent id="VendorEnd_1" />
              </bpmn:process>
            </bpmn:definitions>
            """
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public void A_Task_Without_An_Id_Does_Not_Borrow_The_Process_Id_As_Its_Scope()
    {
        // The policy grants 'confirm' scoped to the enclosing process id. That must not satisfy a
        // confirmation task's requirement - and equally must not be reported as definitely missing,
        // since there is no task id to compare a scope against at all.
        var diagnostics = Collect(
            PolicyFixtures.Policy(
                PolicyFixtures.StandardOrgRules,
                PolicyFixtures.OrgRule(["confirm"], task: "Process_1")
            ),
            """
            <?xml version="1.0" encoding="UTF-8"?>
            <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                              xmlns:altinn="http://altinn.no/process">
              <bpmn:process id="Process_1">
                <bpmn:task>
                  <bpmn:extensionElements>
                    <altinn:taskExtension>
                      <altinn:taskType>confirmation</altinn:taskType>
                    </altinn:taskExtension>
                  </bpmn:extensionElements>
                </bpmn:task>
                <bpmn:endEvent id="EndEvent_1" />
              </bpmn:process>
            </bpmn:definitions>
            """
        );

        var diagnostic = Assert.Single(diagnostics);
        Assert.Equal(NotVerifiable, diagnostic.Id);
        Assert.Equal(["confirm"], Actions(diagnostics, NotVerifiable));
    }

    [Fact]
    public void An_Unreadable_Process_Is_Reported_But_The_Baseline_Is_Still_Checked()
    {
        var diagnostics = Collect(PolicyFixtures.Policy(PolicyFixtures.RoleRule("read")), "<bpmn:definitions");

        Assert.Contains(diagnostics, d => d.Id == NotVerifiable && d.GetMessage().Contains("process.bpmn"));
        Assert.Equal(["read", "write"], Actions(diagnostics, MissingGrant));
    }

    [Fact]
    public void Without_A_Policy_File_Nothing_Is_Reported()
    {
        var diagnostics = new List<Diagnostic>();
        ServiceOwnerPolicyUtils.CollectPolicyDiagnostics(
            policyFile: null,
            processFile: new InMemoryAdditionalText(ProcessPath, ProcessFixtures.Process()),
            metadataFile: null,
            CancellationToken.None,
            diagnostics
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public void The_Org_Comes_From_Application_Metadata_When_The_Policy_Has_No_Placeholders()
    {
        // The policy grants 'ttd', but this app belongs to 'brg' - a cross-org rule is not a grant
        // to this app's owner.
        var diagnostics = Collect(
            PolicyFixtures.Policy(PolicyFixtures.OrgRule(["read", "write"], org: "ttd", app: "some-app")),
            ProcessFixtures.Process(new ProcessTask("Task_1", "data")),
            metadata: Metadata(id: "brg/other-app")
        );

        Assert.Equal(["read", "write"], Actions(diagnostics, MissingGrant));
        Assert.All(diagnostics, d => Assert.Contains("'brg'", d.GetMessage()));
    }

    [Fact]
    public void Diagnostics_Point_At_The_Policy_Document_Element()
    {
        var diagnostics = Collect(
            PolicyFixtures.Policy(PolicyFixtures.RoleRule("read")),
            ProcessFixtures.Process(new ProcessTask("Task_1", "data"))
        );

        var policy = PolicyFixtures.Policy(PolicyFixtures.RoleRule("read"));
        var location = diagnostics[0].Location;
        Assert.Equal(PolicyPath, location.GetLineSpan().Path);
        // The span covers the document element's opening tag, so an editor squiggles the policy
        // itself rather than an arbitrary offset.
        Assert.Equal("<xacml:Policy", policy.Substring(location.SourceSpan.Start, location.SourceSpan.Length));
    }

    /// <summary>
    /// The actions named by the diagnostics of the given id. Both messages render them as
    /// <c>action(s) [a, b]</c>; the org is also bracketed, so the marker matters.
    /// </summary>
    private static string[] Actions(List<Diagnostic> diagnostics, string id)
    {
        const string marker = "action(s) [";
        return diagnostics
            .Where(d => d.Id == id)
            .Select(d => d.GetMessage())
            .Select(m => m.Substring(m.IndexOf(marker, StringComparison.Ordinal) + marker.Length))
            .Select(m => m.Substring(0, m.IndexOf(']')))
            .SelectMany(a => a.Split(", "))
            .Distinct()
            .ToArray();
    }

    private static string Metadata(string id = "ttd/app", bool autoDeleteOnProcessEnd = false) =>
        $$"""
            {
              "id": "{{id}}",
              "org": "{{id.Split('/')[0]}}",
              "autoDeleteOnProcessEnd": {{(autoDeleteOnProcessEnd ? "true" : "false")}},
              "dataTypes": []
            }
            """;

    private static List<Diagnostic> Collect(string policy, string? process = null, string? metadata = null)
    {
        var diagnostics = new List<Diagnostic>();
        ServiceOwnerPolicyUtils.CollectPolicyDiagnostics(
            new InMemoryAdditionalText(PolicyPath, policy),
            process is null ? null : new InMemoryAdditionalText(ProcessPath, process),
            new InMemoryAdditionalText(MetadataPath, metadata ?? Metadata()),
            CancellationToken.None,
            diagnostics
        );
        return diagnostics;
    }
}
