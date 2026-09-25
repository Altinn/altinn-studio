using System;
using System.IO;
using System.Text;
using Xunit;

namespace Designer.Tests;

/// <summary>Temporary: reports the memory the CI runner gives the test host. Remove before merge.</summary>
public class TemporaryMemoryDiagnosticsTest
{
    [Fact]
    public void ReportMemoryLimits()
    {
        var info = GC.GetGCMemoryInfo();
        var sb = new StringBuilder();
        sb.AppendLine(
            $"OS={Environment.OSVersion} cores={Environment.ProcessorCount} serverGC={System.Runtime.GCSettings.IsServerGC}"
        );
        sb.AppendLine(
            $"GC TotalAvailableMemoryBytes={info.TotalAvailableMemoryBytes / 1048576} MB HighMemoryLoadThresholdBytes={info.HighMemoryLoadThresholdBytes / 1048576} MB"
        );
        foreach (
            var path in new[]
            {
                "/proc/meminfo",
                "/sys/fs/cgroup/memory.max",
                "/sys/fs/cgroup/memory.current",
                "/sys/fs/cgroup/memory.peak",
                "/sys/fs/cgroup/memory/memory.limit_in_bytes",
                "/sys/fs/cgroup/cpu.max",
            }
        )
        {
            try
            {
                if (File.Exists(path))
                {
                    string content = File.ReadAllText(path);
                    if (path.EndsWith("meminfo"))
                        content = string.Join(" | ", content.Split('\n', StringSplitOptions.RemoveEmptyEntries)[..3]);
                    sb.AppendLine($"{path}: {content.Trim()}");
                }
            }
            catch (Exception e)
            {
                sb.AppendLine($"{path}: {e.GetType().Name}");
            }
        }
        Assert.Fail("MEMORY DIAGNOSTICS\n" + sb);
    }
}
