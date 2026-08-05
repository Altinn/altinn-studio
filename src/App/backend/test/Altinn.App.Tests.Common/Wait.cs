using System.Diagnostics;
using Xunit;

namespace Altinn.App.Tests.Common;

internal static class Wait
{
    internal static async Task Until(Func<bool> condition, TimeSpan timeout)
    {
        var stopwatch = Stopwatch.StartNew();
        while (stopwatch.Elapsed < timeout)
        {
            if (condition())
            {
                return;
            }

            await Task.Delay(100);
        }

        Assert.True(condition(), $"Condition was not met within {timeout}.");
    }
}
