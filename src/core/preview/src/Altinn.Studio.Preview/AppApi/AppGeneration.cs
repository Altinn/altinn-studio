using System.Globalization;

namespace Altinn.Studio.Preview.AppApi;

internal enum AppGeneration
{
    V8,
    V9,
}

internal static class AppGenerations
{
    public static AppGeneration? Of(string? appLibVersion) =>
        appLibVersion is not null
        && int.TryParse(appLibVersion.Split('.')[0], NumberStyles.None, CultureInfo.InvariantCulture, out int major)
            ? major switch
            {
                >= 9 => AppGeneration.V9,
                8 => AppGeneration.V8,
                _ => null,
            }
            : null;
}
