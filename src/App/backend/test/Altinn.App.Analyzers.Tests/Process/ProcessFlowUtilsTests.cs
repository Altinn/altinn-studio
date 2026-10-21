using Altinn.App.Analyzers.Process;
using Altinn.App.Analyzers.Tests.Fixtures;
using Microsoft.CodeAnalysis;

namespace Altinn.App.Analyzers.Tests.Process;

public class ProcessFlowUtilsTests
{
    private const string ProcessPath = "/repo/App/config/process/process.bpmn";

    private const string Tail =
        " An instance can move only to the tasks, service tasks, exclusive gateways and end events of the process. "
        + "Point the flow at one of them, or remove it.";

    // The gateway's flows have complementary conditions, so exactly one of them matches.
    private const string ValidProcess = """
            <bpmn:startEvent id="StartEvent_1">
              <bpmn:outgoing>Flow_1</bpmn:outgoing>
            </bpmn:startEvent>
            <bpmn:task id="Task_1">
              <bpmn:incoming>Flow_1</bpmn:incoming>
              <bpmn:outgoing>Flow_2</bpmn:outgoing>
            </bpmn:task>
            <bpmn:exclusiveGateway id="Gateway_1" default="Flow_4">
              <bpmn:incoming>Flow_2</bpmn:incoming>
              <bpmn:outgoing>Flow_3</bpmn:outgoing>
              <bpmn:outgoing>Flow_4</bpmn:outgoing>
            </bpmn:exclusiveGateway>
            <bpmn:serviceTask id="Task_2">
              <bpmn:incoming>Flow_3</bpmn:incoming>
              <bpmn:outgoing>Flow_5</bpmn:outgoing>
            </bpmn:serviceTask>
            <bpmn:endEvent id="EndEvent_1">
              <bpmn:incoming>Flow_4</bpmn:incoming>
              <bpmn:incoming>Flow_5</bpmn:incoming>
            </bpmn:endEvent>
            <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1" />
            <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="Gateway_1" />
            <bpmn:sequenceFlow id="Flow_3" sourceRef="Gateway_1" targetRef="Task_2">
              <bpmn:conditionExpression>["equals", 1, 1]</bpmn:conditionExpression>
            </bpmn:sequenceFlow>
            <bpmn:sequenceFlow id="Flow_4" sourceRef="Gateway_1" targetRef="EndEvent_1">
              <bpmn:conditionExpression>["notEquals", 1, 1]</bpmn:conditionExpression>
            </bpmn:sequenceFlow>
            <bpmn:sequenceFlow id="Flow_5" sourceRef="Task_2" targetRef="EndEvent_1" />
        """;

    private const string Flow5 = """<bpmn:sequenceFlow id="Flow_5" sourceRef="Task_2" targetRef="EndEvent_1" />""";

    private const string Flow4Listed = "<bpmn:outgoing>Flow_4</bpmn:outgoing>";

    // The same process with no conditions, so the gateway takes its default.
    private static readonly string _plainGatewayProcess = string.Join(
        "\n",
        ValidProcess.Split('\n').Where(line => !line.Contains("conditionExpression"))
    );

    [Fact]
    public void A_Connected_Process_Is_Valid()
    {
        Assert.Empty(Collect(Process(ValidProcess)));
        Assert.Empty(Collect(Process(_plainGatewayProcess)));
    }

    [Theory]
    [InlineData("""<bpmn:sequenceFlow id="Flow_5" sourceRef="Task_2" />""", "Sequence flow 'Flow_5' has no targetRef.")]
    [InlineData(
        """<bpmn:sequenceFlow id="Flow_5" sourceRef="Task_2" targetRef=" " />""",
        "Sequence flow 'Flow_5' has no targetRef."
    )]
    [InlineData(
        """<bpmn:sequenceFlow id="Flow_5" sourceRef="Task_2" targetRef="Task_9" />""",
        "Sequence flow 'Flow_5' has targetRef 'Task_9', but no element of the process has that id."
    )]
    [InlineData(
        """
            <bpmn:sequenceFlow id="Flow_5" sourceRef="Task_2" targetRef="Parallel_1" />
            <bpmn:parallelGateway id="Parallel_1" />
            """,
        "Sequence flow 'Flow_5' has targetRef 'Parallel_1', a <bpmn:parallelGateway> element, which the app does not run."
    )]
    [InlineData(
        """
            <bpmn:sequenceFlow id="Flow_5" sourceRef="Task_2" targetRef="User_1" />
            <model:userTask xmlns:model="http://www.omg.org/spec/BPMN/20100524/MODEL" id="User_1" />
            """,
        "Sequence flow 'Flow_5' has targetRef 'User_1', a <model:userTask> element, which the app does not run."
    )]
    [InlineData(
        """
            <bpmn:sequenceFlow id="Flow_5" sourceRef="Task_2" targetRef="Plain_1" />
            <task id="Plain_1" />
            """,
        "Sequence flow 'Flow_5' has targetRef 'Plain_1', a <task> element without the BPMN namespace, which the app "
            + "does not run."
    )]
    [InlineData(
        """
            <bpmn:sequenceFlow id="Flow_5" sourceRef="Task_2" targetRef="Foreign_1" />
            <foo:task xmlns:foo="urn:foo" id="Foreign_1" />
            """,
        "Sequence flow 'Flow_5' has targetRef 'Foreign_1', a <foo:task> element without the BPMN namespace, which "
            + "the app does not run."
    )]
    [InlineData(
        """<bpmn:sequenceFlow id="Flow_5" sourceRef="Task_2" targetRef="StartEvent_1" />""",
        "Sequence flow 'Flow_5' leads to start event 'StartEvent_1'."
    )]
    public void A_Followed_Flow_To_An_Element_The_App_Cannot_Move_To_Is_An_Error(string flow5, string expected)
    {
        var diagnostics = Collect(Process(ValidProcess.Replace(Flow5, flow5)));

        AssertIds(diagnostics, "ALTINNAPP1004");
        Assert.Equal(DiagnosticSeverity.Error, diagnostics[0].Severity);
        Assert.Equal(expected + Tail, diagnostics[0].GetMessage());
    }

    [Fact]
    public void A_Flow_To_An_Element_The_App_Cannot_Move_To_Points_At_The_Flow()
    {
        var flow5 = """<bpmn:sequenceFlow id="Flow_5" sourceRef="Task_2" targetRef="Task_9" />""";
        var process = Process(ValidProcess.Replace(Flow5, flow5));

        var diagnostic = Assert.Single(Collect(process));

        var span = diagnostic.Location.SourceSpan;
        Assert.Equal("<bpmn:sequenceFlow", process.Substring(span.Start, span.Length));
        Assert.Equal(process.IndexOf(flow5, StringComparison.Ordinal), span.Start);
    }

    [Fact]
    public void A_Gateway_Flow_To_An_Element_The_App_Cannot_Move_To_Is_An_Error()
    {
        var diagnostics = Collect(
            Process(ValidProcess.Replace("sourceRef=\"Gateway_1\" targetRef=\"EndEvent_1\"", "sourceRef=\"Gateway_1\""))
        );

        AssertIds(diagnostics, "ALTINNAPP1004");
        Assert.Equal("Sequence flow 'Flow_4' has no targetRef." + Tail, diagnostics[0].GetMessage());
    }

    [Fact]
    public void A_Flow_Into_A_Sub_Process_Is_An_Error_And_Its_Contents_Are_Not_Read()
    {
        // The runtime reads only the process's own children, so the sub-process is a dead end and the dangling flow
        // inside it is never followed.
        var diagnostics = Collect(
            Process(
                ValidProcess.Replace(
                    Flow5,
                    """
                    <bpmn:sequenceFlow id="Flow_5" sourceRef="Task_2" targetRef="Sub_1" />
                    <bpmn:subProcess id="Sub_1">
                      <bpmn:task id="Inner_Task" />
                      <bpmn:sequenceFlow id="Flow_Inner" sourceRef="Inner_Task" targetRef="Nothing" />
                    </bpmn:subProcess>
                    """
                )
            )
        );

        AssertIds(diagnostics, "ALTINNAPP1004");
        Assert.Contains("'Flow_5' has targetRef 'Sub_1', a <bpmn:subProcess> element", diagnostics[0].GetMessage());
    }

    [Theory]
    [InlineData("""<bpmn:sequenceFlow id="Flow_X" sourceRef="Gone" targetRef="Nowhere" />""")]
    [InlineData("""<bpmn:sequenceFlow id="Flow_X" targetRef="Nowhere" />""")]
    [InlineData("""<bpmn:sequenceFlow id="Flow_X" sourceRef="EndEvent_1" targetRef="Nowhere" />""")]
    [InlineData(
        """
            <bpmn:parallelGateway id="Parallel_1" />
            <bpmn:sequenceFlow id="Flow_X" sourceRef="Parallel_1" targetRef="Nowhere" />
            """
    )]
    public void A_Flow_The_App_Never_Follows_Is_Not_Reported(string extra)
    {
        Assert.Empty(Collect(Process(ValidProcess + extra)));
    }

    [Fact]
    public void A_Tasks_Flow_Without_A_SourceRef_Is_Not_Followed_So_The_Task_Has_No_Outgoing_Flow()
    {
        var diagnostics = Collect(
            Process(ValidProcess.Replace(Flow5, """<bpmn:sequenceFlow id="Flow_5" targetRef="Nowhere" />"""))
        );

        AssertIds(diagnostics, "ALTINNAPP1008");
        Assert.StartsWith("Service task 'Task_2' has no outgoing sequence flow", diagnostics[0].GetMessage());
    }

    [Fact]
    public void A_Gateway_Listing_An_Id_That_Names_No_Flow_Is_Not_Reported()
    {
        var process = ValidProcess.Replace(Flow4Listed, Flow4Listed + "<bpmn:outgoing>Flow_9</bpmn:outgoing>");

        Assert.Empty(Collect(Process(process)));
    }

    [Theory]
    [InlineData("Flow_5", "", "starts at 'Task_2'")]
    [InlineData("Flow_X", """<bpmn:sequenceFlow id="Flow_X" targetRef="EndEvent_1" />""", "has no sourceRef")]
    public void A_Gateway_Listing_A_Flow_That_Starts_Elsewhere_Is_An_Error(string listed, string extra, string expected)
    {
        // Listed twice, reported once.
        var process = _plainGatewayProcess.Replace(
            Flow4Listed,
            Flow4Listed + $"<bpmn:outgoing>{listed}</bpmn:outgoing><bpmn:outgoing>{listed}</bpmn:outgoing>"
        );

        var diagnostics = Collect(Process(process + extra));

        AssertIds(diagnostics, "ALTINNAPP1005");
        Assert.Equal(DiagnosticSeverity.Error, diagnostics[0].Severity);
        Assert.Equal(
            $"Exclusive gateway 'Gateway_1' lists '{listed}' in <bpmn:outgoing>, but that sequence flow {expected}. "
                + "The app leaves a gateway only through the sequence flows it lists in <bpmn:outgoing>, so every "
                + "flow that starts at the gateway must be listed, and every listed flow must start there. List "
                + "exactly those flows in <bpmn:outgoing>.",
            diagnostics[0].GetMessage()
        );
    }

    [Fact]
    public void A_Gateway_Whose_Outgoing_List_Misses_Its_Default_Flow_Is_An_Error_And_A_Warning()
    {
        var diagnostics = Collect(Process(_plainGatewayProcess.Replace(Flow4Listed, "")));

        AssertIds(diagnostics, "ALTINNAPP1005", "ALTINNAPP1006");
        Assert.StartsWith(
            "Exclusive gateway 'Gateway_1' is the sourceRef of sequence flow 'Flow_4', but does not list it in "
                + "<bpmn:outgoing>.",
            diagnostics[0].GetMessage()
        );
        Assert.Equal(DiagnosticSeverity.Warning, diagnostics[1].Severity);
    }

    [Fact]
    public void A_Default_The_Gateway_Lists_Is_Taken_Even_When_It_Starts_Elsewhere()
    {
        var process = _plainGatewayProcess
            .Replace(Flow4Listed, Flow4Listed + "<bpmn:outgoing>Flow_5</bpmn:outgoing>")
            .Replace("default=\"Flow_4\"", "default=\"Flow_5\"");

        AssertIds(Collect(Process(process)), "ALTINNAPP1005");
    }

    [Fact]
    public void A_Gateway_Default_It_Does_Not_List_Is_A_Warning()
    {
        var diagnostics = Collect(Process(_plainGatewayProcess.Replace("default=\"Flow_4\"", "default=\"Flow_9\"")));

        AssertIds(diagnostics, "ALTINNAPP1006");
        Assert.Equal(DiagnosticSeverity.Warning, diagnostics[0].Severity);
        Assert.Equal(
            "Exclusive gateway 'Gateway_1' has default 'Flow_9', which is not a sequence flow it lists in "
                + "<bpmn:outgoing>, so the app ignores the default. Set default to one of the listed flows, or "
                + "remove it.",
            diagnostics[0].GetMessage()
        );
    }

    [Fact]
    public void A_Gateway_That_Lists_Flows_But_Starts_None_Is_Not_Missing_Outgoing_Flows()
    {
        var process = _plainGatewayProcess.Replace("sourceRef=\"Gateway_1\"", "sourceRef=\"Elsewhere\"");

        var diagnostics = Collect(Process(process));

        AssertIds(diagnostics, "ALTINNAPP1005", "ALTINNAPP1005");
        Assert.Contains(
            "lists 'Flow_3' in <bpmn:outgoing>, but that sequence flow starts at 'Elsewhere'",
            diagnostics[0].GetMessage()
        );
        Assert.Contains("lists 'Flow_4'", diagnostics[1].GetMessage());
    }

    [Theory]
    [InlineData("StartEvent_1", "Start event", "Flow_1")]
    [InlineData("Task_1", "Task", "Flow_2")]
    [InlineData("Task_2", "Service task", "Flow_5")]
    public void An_Element_With_Two_Outgoing_Flows_Is_An_Error(string elementId, string displayName, string firstFlow)
    {
        var process = Process(
            ValidProcess + $"""<bpmn:sequenceFlow id="Flow_Extra" sourceRef="{elementId}" targetRef="EndEvent_1" />"""
        );

        var diagnostics = Collect(process);

        AssertIds(diagnostics, "ALTINNAPP1007");
        Assert.Equal(DiagnosticSeverity.Error, diagnostics[0].Severity);
        Assert.Equal(
            $"{displayName} '{elementId}' has 2 outgoing sequence flows ('{firstFlow}', 'Flow_Extra'), so the app "
                + "cannot tell which one to follow and fails when an instance leaves it. Route the flows through an "
                + "exclusive gateway.",
            diagnostics[0].GetMessage()
        );
        // The diagnostic points at the element's start tag.
        var span = diagnostics[0].Location.SourceSpan;
        Assert.StartsWith("<bpmn:", process.Substring(span.Start, span.Length));
        Assert.StartsWith($" id=\"{elementId}\"", process.Substring(span.End));
    }

    [Fact]
    public void A_Flow_To_Nowhere_Beside_A_Flow_That_Leads_On_Is_Not_Reported()
    {
        // The runtime skips the flow to nowhere and follows the other one.
        var process = ValidProcess + """<bpmn:sequenceFlow id="Flow_Extra" sourceRef="Task_2" targetRef="Nowhere" />""";

        Assert.Empty(Collect(Process(process)));
    }

    [Fact]
    public void Every_Flow_Out_Of_A_Task_Leading_Nowhere_Is_An_Error()
    {
        var process = ValidProcess.Replace(
            Flow5,
            """
            <bpmn:sequenceFlow id="Flow_5" sourceRef="Task_2" targetRef="Nowhere" />
            <bpmn:sequenceFlow id="Flow_6" sourceRef="Task_2" />
            """
        );

        var diagnostics = Collect(Process(process));

        AssertIds(diagnostics, "ALTINNAPP1004", "ALTINNAPP1004");
        Assert.All(diagnostics, d => Assert.Equal(DiagnosticSeverity.Error, d.Severity));
        Assert.StartsWith("Sequence flow 'Flow_5' has targetRef 'Nowhere'", diagnostics[0].GetMessage());
        Assert.StartsWith("Sequence flow 'Flow_6' has no targetRef.", diagnostics[1].GetMessage());
    }

    [Fact]
    public void A_Flow_To_A_Start_Event_Is_An_Error_Beside_A_Flow_That_Leads_On()
    {
        var process =
            ValidProcess + """<bpmn:sequenceFlow id="Flow_Extra" sourceRef="Task_2" targetRef="StartEvent_1" />""";

        var diagnostics = Collect(Process(process));

        AssertIds(diagnostics, "ALTINNAPP1004", "ALTINNAPP1007");
        Assert.Equal(
            "Sequence flow 'Flow_Extra' leads to start event 'StartEvent_1'." + Tail,
            diagnostics[0].GetMessage()
        );
    }

    [Theory]
    [InlineData("")]
    [InlineData("""<bpmn:sequenceFlow id="Flow_6" sourceRef="Task_2" targetRef="EndEvent_1" />""")]
    public void A_Flow_Followed_From_Both_A_Task_And_A_Gateway_Is_Reported_Once(string otherFlow)
    {
        // Task_2 is the flow's sourceRef and the gateway lists it, so the runtime can follow it from either. The
        // gateway fails on it even when Task_2 has another flow that leads on.
        var process =
            _plainGatewayProcess
                .Replace(Flow4Listed, Flow4Listed + "<bpmn:outgoing>Flow_5</bpmn:outgoing>")
                .Replace(Flow5, """<bpmn:sequenceFlow id="Flow_5" sourceRef="Task_2" targetRef="Nowhere" />""")
            + otherFlow;

        var diagnostics = Collect(Process(process));

        AssertIds(diagnostics, "ALTINNAPP1005", "ALTINNAPP1004");
        Assert.StartsWith("Sequence flow 'Flow_5' has targetRef 'Nowhere'", diagnostics[1].GetMessage());
    }

    [Theory]
    [InlineData("Flow_1", "Start event 'StartEvent_1'")]
    [InlineData("Flow_2", "Task 'Task_1'")]
    [InlineData("Flow_5", "Service task 'Task_2'")]
    public void An_Element_Without_An_Outgoing_Flow_Is_An_Error(string removedFlow, string expectedStart)
    {
        var process = Process(
            string.Join(
                "\n",
                ValidProcess.Split('\n').Where(line => !line.Contains($"<bpmn:sequenceFlow id=\"{removedFlow}\""))
            )
        );

        var diagnostics = Collect(process);

        AssertIds(diagnostics, "ALTINNAPP1008");
        Assert.Equal(DiagnosticSeverity.Error, diagnostics[0].Severity);
        Assert.Equal(
            expectedStart
                + " has no outgoing sequence flow, so an instance that reaches it can never move on. Connect it to "
                + "the next element of the process.",
            diagnostics[0].GetMessage()
        );
        var elementId = expectedStart.Split('\'')[1];
        var span = diagnostics[0].Location.SourceSpan;
        Assert.StartsWith("<bpmn:", process.Substring(span.Start, span.Length));
        Assert.StartsWith($" id=\"{elementId}\"", process.Substring(span.End));
    }

    [Fact]
    public void A_Gateway_Without_Outgoing_Flows_Is_An_Error()
    {
        var diagnostics = Collect(
            Process(
                """
                    <bpmn:startEvent id="StartEvent_1" />
                    <bpmn:exclusiveGateway id="Gateway_1" />
                    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Gateway_1" />
                """
            )
        );

        AssertIds(diagnostics, "ALTINNAPP1008");
        Assert.StartsWith("Exclusive gateway 'Gateway_1' has no outgoing sequence flow", diagnostics[0].GetMessage());
    }

    [Fact]
    public void A_Process_Without_Flows_Reports_Only_The_Start_Event()
    {
        var diagnostics = Collect(
            Process(
                """
                    <bpmn:startEvent id="StartEvent_1" />
                    <bpmn:task id="Task_1" />
                    <bpmn:endEvent id="EndEvent_1" />
                """
            )
        );

        // No instance reaches the task, so it is left alone.
        AssertIds(diagnostics, "ALTINNAPP1008");
        Assert.StartsWith("Start event 'StartEvent_1'", diagnostics[0].GetMessage());
    }

    [Theory]
    [InlineData("""<bpmn:task id="Task_Unconnected" />""")]
    [InlineData("""<bpmn:serviceTask id="Task_Unconnected"><bpmn:outgoing>Flow_9</bpmn:outgoing></bpmn:serviceTask>""")]
    [InlineData("""<bpmn:exclusiveGateway id="Gateway_Unconnected" default="Flow_9" />""")]
    [InlineData(
        """
            <bpmn:exclusiveGateway id="Gateway_Unconnected">
              <bpmn:outgoing>Flow_3</bpmn:outgoing>
            </bpmn:exclusiveGateway>
            """
    )]
    [InlineData(
        """
            <bpmn:task id="Island_1" />
            <bpmn:task id="Island_2" />
            <bpmn:sequenceFlow id="Flow_Island" sourceRef="Island_1" targetRef="Island_2" />
            <bpmn:sequenceFlow id="Flow_Island_2" sourceRef="Island_1" targetRef="Nowhere" />
            """
    )]
    public void A_Node_No_Start_Event_Reaches_Is_Not_Checked(string unreached)
    {
        Assert.Empty(Collect(Process(ValidProcess + unreached)));
    }

    [Fact]
    public void A_Node_Reached_Only_Through_A_Gateway_Is_Checked()
    {
        // Only Gateway_1 leads to Task_2.
        var process = ValidProcess.Replace(
            Flow5,
            """<bpmn:sequenceFlow id="Flow_5" sourceRef="Task_2" targetRef="Nowhere" />"""
        );

        var diagnostics = Collect(Process(process));

        AssertIds(diagnostics, "ALTINNAPP1004");
        Assert.StartsWith("Sequence flow 'Flow_5' has targetRef 'Nowhere'", diagnostics[0].GetMessage());
    }

    [Fact]
    public void A_Flow_That_Starts_At_A_Gateway_But_Is_Not_Listed_Reaches_Nothing()
    {
        // The gateway does not list Flow_X, so no instance reaches Task_X and its missing outgoing flow never fails.
        var process =
            _plainGatewayProcess
            + """
                <bpmn:task id="Task_X" />
                <bpmn:sequenceFlow id="Flow_X" sourceRef="Gateway_1" targetRef="Task_X" />
                """;

        var diagnostics = Collect(Process(process));

        AssertIds(diagnostics, "ALTINNAPP1005");
        Assert.StartsWith(
            "Exclusive gateway 'Gateway_1' is the sourceRef of sequence flow 'Flow_X', but does not list it",
            diagnostics[0].GetMessage()
        );
    }

    [Fact]
    public void A_Flow_A_Gateway_Lists_Is_Followed_Even_When_It_Starts_Elsewhere()
    {
        // The gateway lists Flow_Y, so an instance reaches Task_Y, which has no outgoing flow.
        var process =
            _plainGatewayProcess.Replace(Flow4Listed, Flow4Listed + "<bpmn:outgoing>Flow_Y</bpmn:outgoing>")
            + """
                <bpmn:task id="Task_Y" />
                <bpmn:sequenceFlow id="Flow_Y" sourceRef="Elsewhere" targetRef="Task_Y" />
                """;

        var diagnostics = Collect(Process(process));

        AssertIds(diagnostics, "ALTINNAPP1005", "ALTINNAPP1008");
        Assert.Contains("lists 'Flow_Y' in <bpmn:outgoing>", diagnostics[0].GetMessage());
        Assert.StartsWith("Task 'Task_Y' has no outgoing sequence flow", diagnostics[1].GetMessage());
    }

    [Theory]
    [InlineData(
        Flow5,
        """<bpmn:sequenceFlow sourceRef="Task_2" />""",
        "ALTINNAPP1004",
        "A sequence flow without an id has no targetRef."
    )]
    [InlineData(
        "",
        """<bpmn:sequenceFlow sourceRef="Task_2" targetRef="EndEvent_1" />""",
        "ALTINNAPP1007",
        "Service task 'Task_2' has 2 outgoing sequence flows ('Flow_5', one without an id)"
    )]
    [InlineData(
        "",
        """<bpmn:sequenceFlow sourceRef="Gateway_1" targetRef="EndEvent_1" />""",
        "ALTINNAPP1005",
        "Exclusive gateway 'Gateway_1' is the sourceRef of a sequence flow without an id, but does not list it"
    )]
    public void A_Flow_Without_An_Id_Is_Described_As_Such(
        string replaced,
        string flow,
        string expectedId,
        string expectedStart
    )
    {
        var process = replaced.Length > 0 ? ValidProcess.Replace(replaced, flow) : ValidProcess + flow;

        var diagnostics = Collect(Process(process));

        AssertIds(diagnostics, expectedId);
        Assert.StartsWith(expectedStart, diagnostics[0].GetMessage());
    }

    [Fact]
    public void A_Duplicate_Id_Is_Reported_Once_At_The_Second_Element()
    {
        var process = Process(
            ValidProcess
                + """
                <bpmn:endEvent id="Task_1" />
                <bpmn:sequenceFlow id="Task_1" sourceRef="Nowhere" targetRef="EndEvent_1" />
                """
        );

        var diagnostics = Collect(process);

        AssertIds(diagnostics, "ALTINNAPP1009");
        Assert.Equal(DiagnosticSeverity.Error, diagnostics[0].Severity);
        Assert.Equal(
            "The id 'Task_1' is used by 3 elements of the process. Give each element its own id.",
            diagnostics[0].GetMessage()
        );
        var span = diagnostics[0].Location.SourceSpan;
        Assert.Equal("<bpmn:endEvent", process.Substring(span.Start, span.Length));
    }

    [Fact]
    public void A_Gateway_Mixing_Flows_With_And_Without_A_Condition_Is_An_Error()
    {
        var process = ValidProcess.Replace(
            """<bpmn:conditionExpression>["notEquals", 1, 1]</bpmn:conditionExpression>""",
            ""
        );

        var diagnostics = Collect(Process(process));

        AssertIds(diagnostics, "ALTINNAPP1010");
        Assert.Equal(DiagnosticSeverity.Error, diagnostics[0].Severity);
        Assert.Equal(
            "Exclusive gateway 'Gateway_1' has a condition on some outgoing sequence flows, but none on 'Flow_4'. "
                + "The app treats a flow without a condition as always true, so leaving the gateway fails whenever a "
                + "condition holds. Give every outgoing flow a condition.",
            diagnostics[0].GetMessage()
        );
    }

    [Fact]
    public void A_Gateway_With_Two_Flows_Without_A_Condition_Always_Fails()
    {
        var process =
            ValidProcess
                .Replace("""<bpmn:conditionExpression>["notEquals", 1, 1]</bpmn:conditionExpression>""", "")
                .Replace(Flow4Listed, Flow4Listed + "<bpmn:outgoing>Flow_6</bpmn:outgoing>")
            + """<bpmn:sequenceFlow id="Flow_6" sourceRef="Gateway_1" targetRef="EndEvent_1" />""";

        var diagnostics = Collect(Process(process));

        AssertIds(diagnostics, "ALTINNAPP1010");
        Assert.Equal(
            "Exclusive gateway 'Gateway_1' has a condition on some outgoing sequence flows, but none on 'Flow_4', "
                + "'Flow_6'. The app treats a flow without a condition as always true, so those flows always match "
                + "together and leaving the gateway always fails. Give every outgoing flow a condition.",
            diagnostics[0].GetMessage()
        );
    }

    [Theory]
    [InlineData("<bpmn:conditionExpression />")]
    [InlineData("<bpmn:conditionExpression></bpmn:conditionExpression>")]
    [InlineData("<bpmn:conditionExpression>\n   \n</bpmn:conditionExpression>")]
    public void A_Gateway_Listing_A_Flow_With_An_Empty_Condition_Is_An_Error(string emptyCondition)
    {
        // The other flow's condition is valid, so only the empty one is wrong.
        var process = Process(
            ValidProcess.Replace(
                """<bpmn:conditionExpression>["notEquals", 1, 1]</bpmn:conditionExpression>""",
                emptyCondition
            )
        );

        var diagnostics = Collect(process);

        AssertIds(diagnostics, "ALTINNAPP1012");
        Assert.Equal(DiagnosticSeverity.Error, diagnostics[0].Severity);
        Assert.Equal(
            "Exclusive gateway 'Gateway_1' lists sequence flow 'Flow_4', which has an empty condition, so the app "
                + "fails every time an instance leaves the gateway. Give the flow a condition, or remove the empty "
                + "<bpmn:conditionExpression>.",
            diagnostics[0].GetMessage()
        );
        var span = diagnostics[0].Location.SourceSpan;
        Assert.Equal("<bpmn:exclusiveGateway", process.Substring(span.Start, span.Length));
    }

    [Fact]
    public void An_Empty_Condition_Still_Counts_As_A_Condition_For_The_Flows_Without_One()
    {
        var process = ValidProcess
            .Replace("""<bpmn:conditionExpression>["equals", 1, 1]</bpmn:conditionExpression>""", "")
            .Replace(
                """<bpmn:conditionExpression>["notEquals", 1, 1]</bpmn:conditionExpression>""",
                "<bpmn:conditionExpression />"
            );

        var diagnostics = Collect(Process(process));

        AssertIds(diagnostics, "ALTINNAPP1010", "ALTINNAPP1012");
        Assert.Contains("but none on 'Flow_3'.", diagnostics[0].GetMessage());
        Assert.StartsWith("Exclusive gateway 'Gateway_1' lists sequence flow 'Flow_4'", diagnostics[1].GetMessage());
    }

    [Fact]
    public void Two_Gateways_Leading_To_Each_Other_Are_A_Warning()
    {
        var process = Process(
            """
                <bpmn:startEvent id="StartEvent_1" />
                <bpmn:exclusiveGateway id="Gateway_1">
                  <bpmn:outgoing>Flow_2</bpmn:outgoing>
                  <bpmn:outgoing>Flow_3</bpmn:outgoing>
                </bpmn:exclusiveGateway>
                <bpmn:exclusiveGateway id="Gateway_2">
                  <bpmn:outgoing>Flow_4</bpmn:outgoing>
                  <bpmn:outgoing>Flow_5</bpmn:outgoing>
                </bpmn:exclusiveGateway>
                <bpmn:endEvent id="EndEvent_1" />
                <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Gateway_1" />
                <bpmn:sequenceFlow id="Flow_2" sourceRef="Gateway_1" targetRef="Gateway_2" />
                <bpmn:sequenceFlow id="Flow_3" sourceRef="Gateway_1" targetRef="EndEvent_1" />
                <bpmn:sequenceFlow id="Flow_4" sourceRef="Gateway_2" targetRef="Gateway_1" />
                <bpmn:sequenceFlow id="Flow_5" sourceRef="Gateway_2" targetRef="EndEvent_1" />
            """
        );

        var diagnostics = Collect(process);

        AssertIds(diagnostics, "ALTINNAPP1011");
        Assert.Equal(DiagnosticSeverity.Warning, diagnostics[0].Severity);
        Assert.Equal(
            "Exclusive gateway 'Gateway_1' forms a loop with 'Gateway_2', with no task in between. An instance that "
                + "follows the loop makes the app recurse until the process crashes. Put a task in the loop, or "
                + "remove one of its sequence flows.",
            diagnostics[0].GetMessage()
        );
        var span = diagnostics[0].Location.SourceSpan;
        Assert.Equal("<bpmn:exclusiveGateway", process.Substring(span.Start, span.Length));
        Assert.Equal(process.IndexOf("<bpmn:exclusiveGateway id=\"Gateway_1\"", StringComparison.Ordinal), span.Start);
    }

    [Fact]
    public void A_Loop_Of_Three_Gateways_Is_Reported_Once()
    {
        var process = Process(
            """
                <bpmn:startEvent id="StartEvent_1" />
                <bpmn:exclusiveGateway id="Gateway_1">
                  <bpmn:outgoing>Flow_2</bpmn:outgoing>
                  <bpmn:outgoing>Flow_3</bpmn:outgoing>
                </bpmn:exclusiveGateway>
                <bpmn:exclusiveGateway id="Gateway_2">
                  <bpmn:outgoing>Flow_4</bpmn:outgoing>
                  <bpmn:outgoing>Flow_5</bpmn:outgoing>
                </bpmn:exclusiveGateway>
                <bpmn:exclusiveGateway id="Gateway_3">
                  <bpmn:outgoing>Flow_6</bpmn:outgoing>
                  <bpmn:outgoing>Flow_7</bpmn:outgoing>
                </bpmn:exclusiveGateway>
                <bpmn:endEvent id="EndEvent_1" />
                <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Gateway_1" />
                <bpmn:sequenceFlow id="Flow_2" sourceRef="Gateway_1" targetRef="Gateway_2" />
                <bpmn:sequenceFlow id="Flow_3" sourceRef="Gateway_1" targetRef="EndEvent_1" />
                <bpmn:sequenceFlow id="Flow_4" sourceRef="Gateway_2" targetRef="Gateway_3" />
                <bpmn:sequenceFlow id="Flow_5" sourceRef="Gateway_2" targetRef="EndEvent_1" />
                <bpmn:sequenceFlow id="Flow_6" sourceRef="Gateway_3" targetRef="Gateway_1" />
                <bpmn:sequenceFlow id="Flow_7" sourceRef="Gateway_3" targetRef="EndEvent_1" />
            """
        );

        var diagnostics = Collect(process);

        AssertIds(diagnostics, "ALTINNAPP1011");
        Assert.StartsWith(
            "Exclusive gateway 'Gateway_1' forms a loop with 'Gateway_2', 'Gateway_3', with no task in between.",
            diagnostics[0].GetMessage()
        );
    }

    [Fact]
    public void A_Gateway_Leading_To_Itself_Is_A_Warning()
    {
        var process =
            _plainGatewayProcess.Replace(Flow4Listed, Flow4Listed + "<bpmn:outgoing>Flow_Self</bpmn:outgoing>")
            + """<bpmn:sequenceFlow id="Flow_Self" sourceRef="Gateway_1" targetRef="Gateway_1" />""";

        var diagnostics = Collect(Process(process));

        AssertIds(diagnostics, "ALTINNAPP1011");
        Assert.StartsWith(
            "Exclusive gateway 'Gateway_1' leads back to itself, with no task in between.",
            diagnostics[0].GetMessage()
        );
    }

    [Fact]
    public void A_Loop_Through_A_Task_Is_Not_Reported()
    {
        var process = Process(
            """
                <bpmn:startEvent id="StartEvent_1" />
                <bpmn:exclusiveGateway id="Gateway_1" default="Flow_3">
                  <bpmn:outgoing>Flow_2</bpmn:outgoing>
                  <bpmn:outgoing>Flow_3</bpmn:outgoing>
                </bpmn:exclusiveGateway>
                <bpmn:task id="Task_1" />
                <bpmn:exclusiveGateway id="Gateway_2" default="Flow_6">
                  <bpmn:outgoing>Flow_5</bpmn:outgoing>
                  <bpmn:outgoing>Flow_6</bpmn:outgoing>
                </bpmn:exclusiveGateway>
                <bpmn:endEvent id="EndEvent_1" />
                <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Gateway_1" />
                <bpmn:sequenceFlow id="Flow_2" sourceRef="Gateway_1" targetRef="Task_1" />
                <bpmn:sequenceFlow id="Flow_3" sourceRef="Gateway_1" targetRef="EndEvent_1" />
                <bpmn:sequenceFlow id="Flow_4" sourceRef="Task_1" targetRef="Gateway_2" />
                <bpmn:sequenceFlow id="Flow_5" sourceRef="Gateway_2" targetRef="Gateway_1" />
                <bpmn:sequenceFlow id="Flow_6" sourceRef="Gateway_2" targetRef="EndEvent_1" />
            """
        );

        Assert.Empty(Collect(process));
    }

    [Fact]
    public void Two_Separate_Gateway_Loops_Are_Reported_Separately()
    {
        var process = Process(
            """
                <bpmn:startEvent id="StartEvent_1" />
                <bpmn:exclusiveGateway id="Gateway_1">
                  <bpmn:outgoing>Flow_2</bpmn:outgoing>
                  <bpmn:outgoing>Flow_3</bpmn:outgoing>
                </bpmn:exclusiveGateway>
                <bpmn:exclusiveGateway id="Gateway_2">
                  <bpmn:outgoing>Flow_4</bpmn:outgoing>
                </bpmn:exclusiveGateway>
                <bpmn:exclusiveGateway id="Gateway_3">
                  <bpmn:outgoing>Flow_5</bpmn:outgoing>
                  <bpmn:outgoing>Flow_6</bpmn:outgoing>
                </bpmn:exclusiveGateway>
                <bpmn:endEvent id="EndEvent_1" />
                <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Gateway_1" />
                <bpmn:sequenceFlow id="Flow_2" sourceRef="Gateway_1" targetRef="Gateway_2" />
                <bpmn:sequenceFlow id="Flow_3" sourceRef="Gateway_1" targetRef="Gateway_3" />
                <bpmn:sequenceFlow id="Flow_4" sourceRef="Gateway_2" targetRef="Gateway_1" />
                <bpmn:sequenceFlow id="Flow_5" sourceRef="Gateway_3" targetRef="Gateway_3" />
                <bpmn:sequenceFlow id="Flow_6" sourceRef="Gateway_3" targetRef="EndEvent_1" />
            """
        );

        var diagnostics = Collect(process);

        AssertIds(diagnostics, "ALTINNAPP1011", "ALTINNAPP1011");
        Assert.StartsWith("Exclusive gateway 'Gateway_1' forms a loop with 'Gateway_2',", diagnostics[0].GetMessage());
        Assert.StartsWith("Exclusive gateway 'Gateway_3' leads back to itself,", diagnostics[1].GetMessage());
    }

    [Fact]
    public void The_Diagnostic_Points_At_The_Element()
    {
        var process = Process(_plainGatewayProcess.Replace("default=\"Flow_4\"", "default=\"Flow_9\""));

        var diagnostic = Assert.Single(Collect(process));

        var span = diagnostic.Location.SourceSpan;
        Assert.Equal("<bpmn:exclusiveGateway", process.Substring(span.Start, span.Length));
        Assert.Equal(ProcessPath, diagnostic.Location.GetLineSpan().Path);
    }

    [Fact]
    public void Several_Processes_Are_Ignored()
    {
        var process = Process(ValidProcess)
            .Replace(
                "</bpmn:definitions>",
                """<bpmn:process id="Other"><bpmn:task id="Lonely" /></bpmn:process></bpmn:definitions>"""
            );

        Assert.Empty(Collect(process));
    }

    [Fact]
    public void A_File_Without_A_Process_Is_Ignored()
    {
        const string definitions = """
            <?xml version="1.0" encoding="UTF-8"?>
            <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Definitions_1">
              <bpmn:task id="Lonely" />
            </bpmn:definitions>
            """;

        Assert.Empty(Collect(definitions));
    }

    [Fact]
    public void Invalid_Xml_Is_Ignored()
    {
        Assert.Empty(Collect("<bpmn:definitions"));
    }

    private static void AssertIds(List<Diagnostic> diagnostics, params string[] expected) =>
        Assert.Equal(expected, diagnostics.Select(d => d.Id));

    private static List<Diagnostic> Collect(string process)
    {
        var diagnostics = new List<Diagnostic>();
        ProcessFlowUtils.CollectDiagnostics(
            [new InMemoryAdditionalText(ProcessPath, process)],
            CancellationToken.None,
            diagnostics
        );
        return diagnostics;
    }

    private static string Process(string elements) =>
        $"""
            <?xml version="1.0" encoding="UTF-8"?>
            <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:altinn="http://altinn.no/process" id="Definitions_1">
              <bpmn:process id="Altinn_Process_Definition" isExecutable="true">
            {elements}
              </bpmn:process>
            </bpmn:definitions>
            """;
}
