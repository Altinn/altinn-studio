using System;
using System.Diagnostics.CodeAnalysis;
using Altinn.Studio.Common.App;

namespace Altinn.Studio.Common.Tests.App;

/// <summary>An app whose files a test makes up.</summary>
internal sealed class TestAppSource : AppSource
{
    public static AppFilePath Path(string relativePath) =>
        TryPath(relativePath, out AppFilePath? path)
            ? path
            : throw new ArgumentException($"'{relativePath}' is not a path inside an app.", nameof(relativePath));

    public static bool TryPath(string? relativePath, [NotNullWhen(true)] out AppFilePath? path) =>
        TryCreatePath(relativePath, out path);
}
