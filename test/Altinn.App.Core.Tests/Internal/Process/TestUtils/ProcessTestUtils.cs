using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Tests.TestUtils;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process.TestUtils;

internal static class ProcessTestUtils
{
    private static readonly string TestDataPath = Path.Join("Internal", "Process", "TestData");

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
        var s = new FileStream(
            Path.Join(PathUtils.GetCoreTestsPath(), testDataPath, bpmnfile),
            FileMode.Open,
            FileAccess.Read
        );
        processServiceMock.Setup(p => p.GetProcessDefinition()).Returns(s);
        return new ProcessReader(processServiceMock.Object, telemetrySink?.Object);
    }
}
