using AltinnCore.Common.Services.Interfaces;
using Moq;

namespace AltinnCore.UnitTest.Helpers
{
    /// <summary>
    /// Helper for source controll mocking
    /// </summary>
    public static class SourceControlMockHelper
    {
        /// <summary>
        /// Return a Source control mock
        /// </summary>
        /// <returns>The mock</returns>
        public static Moq.Mock<ISourceControl> GetMock()
        {
            Mock<ISourceControl> moqSourceControl = new Mock<ISourceControl>();
            return moqSourceControl;
        }
    }
}
