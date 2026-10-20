using System.Reflection;
using System.Runtime.CompilerServices;
using Altinn.App.Analyzers.Process;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process.ProcessTasks;

namespace Altinn.App.Analyzers.Tests.Process;

/// <summary>
/// Pins the analyzer's copy of the built-in task types to the task classes the app libraries ship. If it fails, a
/// built-in task was added, removed or changed interface, and <see cref="BuiltInTaskTypes"/> must follow.
/// </summary>
public class BuiltInTaskTypesTests
{
    /// <summary>The fallback the engine resolves for a task without a type; no BPMN task names it.</summary>
    private const string NullTaskType = "NullType";

    [Fact]
    public void Service_Tasks_Match_The_Built_In_Service_Task_Classes()
    {
        var expected = BuiltInTasks().Where(t => t.IsServiceTask).Select(t => t.Type).Order(StringComparer.Ordinal);

        Assert.Equal(expected, BuiltInTaskTypes.ServiceTasks.Order(StringComparer.Ordinal));
    }

    [Fact]
    public void Process_Tasks_Match_The_Built_In_Process_Task_Classes()
    {
        var expected = BuiltInTasks()
            .Where(t => !t.IsServiceTask && t.Type != NullTaskType)
            .Select(t => t.Type)
            .Order(StringComparer.Ordinal);

        Assert.Equal(expected, BuiltInTaskTypes.ProcessTasks.Order(StringComparer.Ordinal));
    }

    [Fact]
    public void Every_Task_Type_Constant_Is_Classified()
    {
        // Guards the reflection below: a built-in class it fails to find would drop out of both lists unnoticed.
        var constants = typeof(AltinnTaskTypes)
            .GetFields(BindingFlags.Public | BindingFlags.Static)
            .Where(f => f is { IsLiteral: true } && f.FieldType == typeof(string))
            .Select(f => (string?)f.GetRawConstantValue())
            .OfType<string>()
            .Order(StringComparer.Ordinal);

        Assert.Equal(
            constants,
            BuiltInTaskTypes.ServiceTasks.Union(BuiltInTaskTypes.ProcessTasks).Order(StringComparer.Ordinal)
        );
    }

    private static List<(string Type, bool IsServiceTask)> BuiltInTasks() =>
        new[] { typeof(IProcessTask).Assembly, Assembly.Load("Altinn.App.Clients.Fiks") }
            .SelectMany(assembly => assembly.GetTypes())
            .Where(type => type is { IsClass: true, IsAbstract: false } && typeof(IProcessTask).IsAssignableFrom(type))
            .Select(type =>
                (
                    // The built-in classes return a literal from Type, so it can be read without their dependencies.
                    ((IProcessTask)RuntimeHelpers.GetUninitializedObject(type)).Type,
                    typeof(IPipelineServiceTask).IsAssignableFrom(type)
                )
            )
            .ToList();
}
