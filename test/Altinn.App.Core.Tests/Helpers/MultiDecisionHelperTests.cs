using System.Security.Claims;
using System.Text.Json;
using Altinn.App.Core.Helpers;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Xunit;
using Xunit.Abstractions;

namespace Altinn.App.Core.Tests.Helpers;

public class MultiDecisionHelperTests
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new() { WriteIndented = true };

    private readonly ITestOutputHelper _output;

    public MultiDecisionHelperTests(ITestOutputHelper output)
    {
        _output = output;
    }

    [Fact]
    public void CreateMultiDecisionRequest_generates_multidecisionrequest_with_all_actions_current_task_elemtnId()
    {
        var claimsPrincipal = GetClaims("1337");

        var instance = new Instance()
        {
            Id = "1337/1dd16477-187b-463c-8adf-592c7fa78459",
            Org = "tdd",
            InstanceOwner = new InstanceOwner() { PartyId = "1337" },
            AppId = "tdd/test-app",
            Process = new ProcessState()
            {
                CurrentTask = new ProcessElementInfo() { AltinnTaskType = "Data", ElementId = "Task_1" },
                EndEvent = "EndEvent_1"
            }
        };

        var actions = new List<string>() { "sign", "reject" };

        var result = MultiDecisionHelper.CreateMultiDecisionRequest(claimsPrincipal, instance, actions);

        CompareWithOrUpdateGoldenFile("multidecision-all-actions-task", result);
    }

    [Fact]
    public void CreateMultiDecisionRequest_generates_multidecisionrequest_with_all_actions_instanceId_is_GUID_only()
    {
        var claimsPrincipal = GetClaims("1337");

        var instance = new Instance()
        {
            Id = "1dd16477-187b-463c-8adf-592c7fa78459",
            Org = "tdd",
            InstanceOwner = new InstanceOwner() { PartyId = "1337" },
            AppId = "tdd/test-app",
            Process = new ProcessState()
            {
                CurrentTask = new ProcessElementInfo() { AltinnTaskType = "Data", ElementId = "Task_1" },
                EndEvent = "EndEvent_1"
            }
        };

        var actions = new List<string>() { "sign", "reject" };

        var result = MultiDecisionHelper.CreateMultiDecisionRequest(claimsPrincipal, instance, actions);

        CompareWithOrUpdateGoldenFile("multidecision-all-actions-guid", result);
    }

    [Fact]
    public void CreateMultiDecisionRequest_generates_multidecisionrequest_with_all_actions_endevent()
    {
        var claimsPrincipal = GetClaims("1337");

        var instance = new Instance()
        {
            Id = "1337/1dd16477-187b-463c-8adf-592c7fa78459",
            Org = "tdd",
            InstanceOwner = new InstanceOwner() { PartyId = "1337" },
            AppId = "tdd/test-app",
            Process = new ProcessState()
            {
                CurrentTask = new ProcessElementInfo() { AltinnTaskType = "Task_1" },
                EndEvent = "EndEvent_1"
            }
        };

        var actions = new List<string>() { "sign", "reject" };

        var result = MultiDecisionHelper.CreateMultiDecisionRequest(claimsPrincipal, instance, actions);

        CompareWithOrUpdateGoldenFile("multidecision-all-actions-endevent", result);
    }

    [Fact]
    public void CreateMultiDecisionRequest_throws_ArgumentNullException_if_user_is_null()
    {
        var instance = new Instance()
        {
            Id = "1337/1dd16477-187b-463c-8adf-592c7fa78459",
            Org = "tdd",
            InstanceOwner = new InstanceOwner() { PartyId = "1337" },
            AppId = "tdd/test-app",
            Process = new ProcessState()
            {
                CurrentTask = new ProcessElementInfo() { AltinnTaskType = "Task_1" },
                EndEvent = "EndEvent_1"
            }
        };

        var actions = new List<string>() { "sign", "reject" };
        Action act = () => MultiDecisionHelper.CreateMultiDecisionRequest(null, instance, actions);
        act.Should().Throw<ArgumentNullException>().WithMessage("Value cannot be null. (Parameter 'user')");
    }

    [Fact]
    public void ValidateDecisionResult_all_actions_allowed()
    {
        var response = GetXacmlJsonRespons("all-actions-allowed");
        var expected = new Dictionary<string, bool>()
        {
            { "read", true },
            { "write", true },
            { "complete", true },
            { "lookup", true }
        };
        var actions = new Dictionary<string, bool>()
        {
            { "read", false },
            { "write", false },
            { "complete", false },
            { "lookup", false }
        };
        var result = MultiDecisionHelper.ValidatePdpMultiDecision(actions, response, GetClaims("501337"));
        result.Should().BeEquivalentTo(expected);
    }

    [Fact]
    public void ValidateDecisionResult_one_action_denied()
    {
        var response = GetXacmlJsonRespons("one-action-denied");
        var expected = new Dictionary<string, bool>()
        {
            { "read", true },
            { "write", true },
            { "complete", true },
            { "lookup", false }
        };
        var actions = new Dictionary<string, bool>()
        {
            { "read", false },
            { "write", false },
            { "complete", false },
            { "lookup", false }
        };
        var result = MultiDecisionHelper.ValidatePdpMultiDecision(actions, response, GetClaims("501337"));
        result.Should().BeEquivalentTo(expected);
    }

    [Fact]
    public void ValidateDecisionResult_throws_ArgumentNullException_if_response_is_null()
    {
        var actions = new Dictionary<string, bool>()
        {
            { "read", false },
            { "write", false },
            { "complete", false },
            { "lookup", false }
        };
        Action act = () => MultiDecisionHelper.ValidatePdpMultiDecision(actions, null, GetClaims("501337"));
        act.Should().Throw<ArgumentNullException>().WithMessage("Value cannot be null. (Parameter 'results')");
    }

    [Fact]
    public void ValidateDecisionResult_throws_ArgumentNullException_if_user_is_null()
    {
        var response = GetXacmlJsonRespons("one-action-denied");
        var actions = new Dictionary<string, bool>()
        {
            { "read", false },
            { "write", false },
            { "complete", false },
            { "lookup", false }
        };
        Action act = () => MultiDecisionHelper.ValidatePdpMultiDecision(actions, response, null);
        act.Should().Throw<ArgumentNullException>().WithMessage("Value cannot be null. (Parameter 'user')");
    }

    private static ClaimsPrincipal GetClaims(string partyId)
    {
        return new ClaimsPrincipal(
            new List<ClaimsIdentity>()
            {
                new(
                    new List<Claim>
                    {
                        new("urn:altinn:partyid", partyId, "#integer"),
                        new("urn:altinn:authlevel", "3", "#integer"),
                    }
                )
            }
        );
    }

    private static string XacmlJsonRequestRootToString(XacmlJsonRequestRoot request)
    {
        return JsonSerializer.Serialize(request, _jsonSerializerOptions);
    }

    private void CompareWithOrUpdateGoldenFile(string testId, XacmlJsonRequestRoot xacmlJsonRequestRoot)
    {
        bool updateGoldeFiles = Environment.GetEnvironmentVariable("UpdateGoldenFiles") == "true";
        string goldenFilePath = Path.Join("Helpers", "TestData", "MultiDecisionHelper", testId + ".golden.json");
        string xacmlJsonRequestRootAsString = XacmlJsonRequestRootToString(xacmlJsonRequestRoot);
        if (updateGoldeFiles)
        {
            File.WriteAllText(Path.Join("..", "..", "..", goldenFilePath), xacmlJsonRequestRootAsString);
        }
        else
        {
            _output.WriteLine("To update golden files, run with environment variable value UpdateGoldenFiles=true");
            _output.WriteLine("Golden file path: " + new FileInfo(goldenFilePath)?.FullName);
        }

        string goldenFileContent = File.ReadAllText(goldenFilePath);
        Assert.Equal(goldenFileContent, xacmlJsonRequestRootAsString);
    }

    private static List<XacmlJsonResult> GetXacmlJsonRespons(string filename)
    {
        var xacmlJesonRespons = File.ReadAllText(
            Path.Join("Helpers", "TestData", "MultiDecisionHelper", filename + ".json")
        );
        return JsonSerializer.Deserialize<List<XacmlJsonResult>>(xacmlJesonRespons);
    }
}
