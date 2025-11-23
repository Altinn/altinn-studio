#nullable disable
using System;

namespace Altinn.Studio.Designer.Helpers
{
    public static class OrgUtil
    {
        public static bool IsTestEnv(string org)
        {
            return string.Equals(org, "ttd", StringComparison.OrdinalIgnoreCase);
        }
    }
}
