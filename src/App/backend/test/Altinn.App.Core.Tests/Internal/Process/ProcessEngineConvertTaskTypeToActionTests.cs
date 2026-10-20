using System.Reflection;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Internal.Process;

namespace Altinn.App.Core.Tests.Internal.Process;

public sealed class ProcessEngineConvertTaskTypeToActionTests
{
    // The action process/completeProcess performs for every built-in task type. payment and subformPdf
    // pass through as their own names: the result reaches user action handlers, gateways, the workflow
    // engine and telemetry, so changing an entry changes recorded behaviour.
    private static readonly Dictionary<string, string> _expectedActions = new()
    {
        [AltinnTaskTypes.Data] = "write",
        [AltinnTaskTypes.Feedback] = "write",
        [AltinnTaskTypes.Pdf] = "write",
        [AltinnTaskTypes.EFormidling] = "write",
        [AltinnTaskTypes.FiksArkiv] = "write",
        [AltinnTaskTypes.Confirmation] = "confirm",
        [AltinnTaskTypes.Signing] = "sign",
        [AltinnTaskTypes.Payment] = AltinnTaskTypes.Payment,
        [AltinnTaskTypes.SubformPdf] = AltinnTaskTypes.SubformPdf,
    };

    [Fact]
    public void Every_built_in_task_type_has_a_decided_action()
    {
        string[] builtInTaskTypes = typeof(AltinnTaskTypes)
            .GetFields(BindingFlags.Public | BindingFlags.Static)
            .Where(field => field is { IsLiteral: true } && field.FieldType == typeof(string))
            .Select(field => (string)(field.GetRawConstantValue() ?? throw new InvalidOperationException(field.Name)))
            .ToArray();

        Assert.Equal(
            builtInTaskTypes.Order(StringComparer.Ordinal),
            _expectedActions.Keys.Order(StringComparer.Ordinal)
        );
    }

    [Fact]
    public void Built_in_task_types_map_to_their_decided_action()
    {
        foreach ((string taskType, string expectedAction) in _expectedActions)
        {
            Assert.Equal(expectedAction, ProcessEngine.ConvertTaskTypeToAction(taskType));
        }
    }

    [Fact]
    public void Custom_task_type_is_performed_as_its_own_name()
    {
        Assert.Equal("customTask", ProcessEngine.ConvertTaskTypeToAction("customTask"));
    }
}
