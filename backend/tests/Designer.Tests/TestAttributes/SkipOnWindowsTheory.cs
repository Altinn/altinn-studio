using System.Runtime.InteropServices;
using Xunit;

namespace Designer.Tests.TestAttributes
{
    public class SkipOnWindowsTheory : TheoryAttribute
    {
        public SkipOnWindowsTheory()
        {
            if(RuntimeInformation.IsOSPlatform(OSPlatform.Windows)) {
                Skip = "Ignoring test on Windows platform.";
            }
        }
    }
}
