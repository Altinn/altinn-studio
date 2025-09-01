using System.Runtime.InteropServices;
using Xunit;

namespace Designer.Tests.TestAttributes
{
    public sealed class SkipOnOsPlatformsFact : FactAttribute
    {
        public SkipOnOsPlatformsFact(params string[] osPlatforms)
        {
            foreach (string osPlatform in osPlatforms)
            {
                if (RuntimeInformation.IsOSPlatform(OSPlatform.Create(osPlatform)))
                {
                    Skip = $"Ignoring test on {osPlatform} platform.";
                }
            }
        }
    }
}
