using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Tests.Mocks;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process.TestUtils;

internal static class ProcessTestUtils
{
    private static readonly string TestDataPath = Path.Combine("Internal", "Process", "TestData");

    internal static ProcessReader SetupProcessReader(
        string bpmnfile,
        string? testDataPath = null,
        TelemetrySink? telemetrySink = null
    )
    {
        if (testDataPath == null)
        {
            testDataPath = TestDataPath;
        }

        Mock<IProcessClient> processServiceMock = new Mock<IProcessClient>();
        var s = new FileStream(Path.Combine(testDataPath, bpmnfile), FileMode.Open, FileAccess.Read);
        processServiceMock.Setup(p => p.GetProcessDefinition()).Returns(s);
        return new ProcessReader(processServiceMock.Object, telemetrySink?.Object);
    }
}
