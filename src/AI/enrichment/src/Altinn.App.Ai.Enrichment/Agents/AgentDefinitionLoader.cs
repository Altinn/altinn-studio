using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace Altinn.App.Ai.Enrichment.Agents;

/// <summary>
/// Reads <c>agent.yaml</c> from an agent folder and produces the list of
/// step definitions in declaration order.
/// </summary>
public static class AgentDefinitionLoader
{
    public static AgentDefinition Load(AgentFolder folder)
    {
        if (!File.Exists(folder.DefinitionPath))
        {
            throw new FileNotFoundException(
                $"Agent definition not found at {folder.DefinitionPath}. " +
                $"Every agent folder must contain an agent.yaml.",
                folder.DefinitionPath);
        }

        var yaml = File.ReadAllText(folder.DefinitionPath);
        var deserializer = new DeserializerBuilder()
            .WithNamingConvention(CamelCaseNamingConvention.Instance)
            .IgnoreUnmatchedProperties()
            .Build();

        return deserializer.Deserialize<AgentDefinition>(yaml)
            ?? throw new InvalidOperationException($"{folder.DefinitionPath} parsed to null.");
    }
}
