namespace Altinn.Studio.AppDist;

/// <summary>
/// studioctl hands the cache directory to its .NET hosts in this variable. The Go side declares the
/// same name as <c>config.EnvAppDistCache</c> in <c>internal/config/config.go</c>.
/// </summary>
public static class AppDistEnvironment
{
    public const string CacheDirectoryVariable = "STUDIOCTL_APP_DIST_CACHE";

    public static AppDist? CreateFromEnvironment()
    {
        var cacheDirectory = Environment.GetEnvironmentVariable(CacheDirectoryVariable);
        return string.IsNullOrWhiteSpace(cacheDirectory) ? null : AppDist.CreateDefault(cacheDirectory);
    }
}
