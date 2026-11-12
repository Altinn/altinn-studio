using System.Globalization;
using System.Text;
using Altinn.Studio.Common.Domain;

namespace Altinn.Studio.Fleet.Store;

/// <summary>Writes the README of an environment's folder, for whoever finds the folder without the tool.</summary>
internal static class Readme
{
    public static void Write(FleetStore store, RuntimeEnvironment environment, FleetIndex index)
    {
        string content = Render(environment, index);
        string path = store.ReadmePath(environment);
        byte[] bytes = Encoding.UTF8.GetBytes(content);
        try
        {
            if (File.Exists(path) && File.ReadAllBytes(path).AsSpan().SequenceEqual(bytes))
            {
                return;
            }
        }
        catch (IOException)
        {
            // Write it again.
        }

        FleetStore.WriteAtomically(path, bytes);
    }

    private static string Render(RuntimeEnvironment environment, FleetIndex index)
    {
        string name = environment.RegistryName;
        return string.Create(
            CultureInfo.InvariantCulture,
            $$"""
            # Altinn apps in {{name}}

            The source of the {{Count(index.Count("apps"), "app", "apps")}} that run in {{name}}, at the commit of their
            deployed version, in `apps/<org>/<app>`. `index.sqlite` describes them. The content last changed at
            {{index.ReadMeta("last_content_change") ?? "an unknown time"}}.

            altinn-fleet keeps this folder up to date and queries the index:
            https://github.com/Altinn/altinn-studio/tree/main/src/tools/altinn-fleet

            """
        );
    }

    private static string Count(long count, string one, string many) =>
        string.Create(CultureInfo.InvariantCulture, $"{count} {(count == 1 ? one : many)}");
}
