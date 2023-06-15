using System.Runtime.InteropServices;
using Xunit;

namespace Designer.Tests.TestAttributes
{
    public sealed class SkipOnWindowsFact : FactAttribute
    {
        public SkipOnWindowsFact()
        {
            if(RuntimeInformation.IsOSPlatform(OSPlatform.Windows)) {
                Skip = "Ignoring test on Windows platform.";
            }
        }
    }
}
