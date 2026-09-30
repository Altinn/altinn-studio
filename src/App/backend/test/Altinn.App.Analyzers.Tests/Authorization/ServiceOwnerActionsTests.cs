using System.Reflection;
using Altinn.App.Analyzers.Authorization;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Internal.Process;

namespace Altinn.App.Analyzers.Tests.Authorization;

/// <summary>
/// Pins the analyzer's copy of the task-type to action mapping to the runtime's. The analyzer targets
/// netstandard2.0 and cannot reference Altinn.App.Core, so the table is duplicated - this test is
/// what keeps the duplicate honest. If it fails, the runtime mapping changed and
/// <see cref="ServiceOwnerActions"/> must follow (and so must the equivalent table in the
/// v8-to-v9 policy migrator in studioctl).
/// </summary>
public class ServiceOwnerActionsTests
{
    /// <summary>Every task type the app backend knows about, plus a custom one.</summary>
    public static TheoryData<string> TaskTypes
    {
        get
        {
            var data = new TheoryData<string>();
            foreach (var taskType in KnownTaskTypes())
            {
                data.Add(taskType);
            }

            // Apps may declare their own task types, which fall through to the switch's default arm.
            data.Add("someCustomTaskType");
            return data;
        }
    }

    [Theory]
    [MemberData(nameof(TaskTypes))]
    public void ProcessNextActions_Match_ProcessEngineAuthorizer(string taskType)
    {
        string[] expected = ProcessEngineAuthorizer.GetActionsThatAllowProcessNextForTaskType(taskType);

        string[] actual = ServiceOwnerActions.ProcessNextActionsForTaskType(taskType);

        Assert.Equal(expected, actual);
    }

    [Theory]
    [MemberData(nameof(TaskTypes))]
    public void IsCoveredByWrite_Matches_Whether_Write_Allows_Process_Next(string taskType)
    {
        bool expected = ProcessEngineAuthorizer.GetActionsThatAllowProcessNextForTaskType(taskType).Contains("write");

        Assert.Equal(expected, ServiceOwnerActions.IsCoveredByWrite(taskType));
    }

    [Fact]
    public void KnownTaskTypes_Are_Discovered()
    {
        // Guards the reflection above: an empty list would make the theories vacuously pass.
        Assert.Contains(AltinnTaskTypes.Confirmation, KnownTaskTypes());
        Assert.True(KnownTaskTypes().Count > 5);
    }

    private static List<string> KnownTaskTypes() =>
        typeof(AltinnTaskTypes)
            .GetFields(BindingFlags.Public | BindingFlags.Static | BindingFlags.FlattenHierarchy)
            .Where(f => f is { IsLiteral: true, IsInitOnly: false } && f.FieldType == typeof(string))
            .Select(f => (string?)f.GetRawConstantValue())
            .OfType<string>()
            .ToList();
}
