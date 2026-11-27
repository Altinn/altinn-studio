using Altinn.App.Core.Internal.WorkflowEngine;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

public class ServiceTaskVerdictFormatTests
{
    private static readonly Dictionary<string, ServiceTaskVerdict> _verdicts = new()
    {
        ["AwaitNextReply()"] = new ServiceTaskVerdict.AwaitNextReply(),
        ["Completed()"] = new ServiceTaskVerdict.Completed(),
        ["Success(\"confirm\")"] = new ServiceTaskVerdict.Success("confirm"),
        ["Success()"] = new ServiceTaskVerdict.Success(Action: null),
        ["Conclude(Success(\"confirm\"))"] = new ServiceTaskVerdict.Conclude(new ServiceTaskVerdict.Success("confirm")),
        ["Conclude(Success())"] = new ServiceTaskVerdict.Conclude(new ServiceTaskVerdict.Success(Action: null)),
    };

    // The stored format: another version of the app reads these up to 48 hours after this one wrote them.
    public static TheoryData<string, string> StoredVerdicts =>
        new()
        {
            { "AwaitNextReply()", """{"kind":"awaitNextReply"}""" },
            { "Completed()", """{"kind":"completed"}""" },
            { "Success(\"confirm\")", """{"kind":"success","action":"confirm"}""" },
            { "Success()", """{"kind":"success"}""" },
            {
                "Conclude(Success(\"confirm\"))",
                """{"kind":"conclude","result":{"kind":"success","action":"confirm"}}"""
            },
            { "Conclude(Success())", """{"kind":"conclude","result":{"kind":"success"}}""" },
        };

    [Theory]
    [MemberData(nameof(StoredVerdicts))]
    public void Write_StoresEachVerdictInTheFixedFormat(string verdict, string stored)
    {
        Assert.Equal(stored, ServiceTaskVerdictFormat.Write(_verdicts[verdict]));
    }

    [Theory]
    [MemberData(nameof(StoredVerdicts))]
    public void Read_ReadsEachVerdictFromTheFixedFormat(string verdict, string stored)
    {
        Assert.Equal(_verdicts[verdict], ServiceTaskVerdictFormat.Read(stored));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("not json")]
    [InlineData("[]")]
    [InlineData("""{"action":"confirm"}""")]
    [InlineData("""{"kind":1}""")]
    [InlineData("""{"kind":"release"}""")]
    [InlineData("""{"kind":"completed","release":true}""")]
    [InlineData("""{"kind":"completed","kind":"completed"}""")]
    [InlineData("""{"kind":"success","action":5}""")]
    [InlineData("""{"kind":"success","action":null}""")]
    [InlineData("""{"kind":"conclude"}""")]
    [InlineData("""{"kind":"conclude","result":{"kind":"completed"}}""")]
    [InlineData("""{"kind":"conclude","result":{"kind":"release"}}""")]
    public void Read_RefusesAValueThisVersionDoesNotKnow(string? stored)
    {
        Assert.Null(ServiceTaskVerdictFormat.Read(stored));
    }
}
