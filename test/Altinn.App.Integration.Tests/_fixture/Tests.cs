using System.Security.Cryptography;
using System.Text;

namespace Altinn.App.Integration.Tests;

public class FixtureTests
{
    [Fact(Skip = "Takes some time to pack, so let's not run this every time")]
    public async Task Produces_Deterministic_NuGet_Packages()
    {
        using var cts = new CancellationTokenSource(TimeSpan.FromMinutes(2));

        var output1 = Path.Join(Path.GetTempPath(), Path.GetRandomFileName());
        Assert.False(Directory.Exists(output1), $"Output directory already exists: {output1}");
        var output2 = Path.Join(Path.GetTempPath(), Path.GetRandomFileName());
        Assert.False(Directory.Exists(output2), $"Output directory already exists: {output2}");

        await NuGetPackaging.PackLibraries(output1, null, cts.Token);
        await NuGetPackaging.PackLibraries(output2, null, cts.Token);

        var nupkgFiles1 = Directory.GetFiles(output1, "*.nupkg");
        var nupkgFiles2 = Directory.GetFiles(output2, "*.nupkg");
        Assert.Equal(nupkgFiles1.Length, nupkgFiles2.Length);
        Assert.True(nupkgFiles1.Length > 0, "No NuGet packages were created");
        for (int i = 0; i < nupkgFiles1.Length; i++)
        {
            var nupkgFile1 = nupkgFiles1[i];
            var nupkgFile2 = nupkgFiles2[i];
            Assert.Equal(Path.GetFileName(nupkgFile1), Path.GetFileName(nupkgFile2));
            var checksums = await Task.WhenAll(Checksum(nupkgFile1), Checksum(nupkgFile2));
            Assert.Equal(checksums[0], checksums[1]);
        }

        Directory.Delete(output1, true);
        Directory.Delete(output2, true);

        async Task<string> Checksum(string filePath)
        {
            await using var stream = File.OpenRead(filePath);
            using var sha256 = SHA256.Create();
            var hash = await sha256.ComputeHashAsync(stream, cts.Token);
            StringBuilder builder = new StringBuilder();
            for (int i = 0; i < hash.Length; i++)
                builder.Append(hash[i].ToString("x2")); // "x2" formats as two lowercase hexadecimal digits
            return builder.ToString();
        }
    }
}
