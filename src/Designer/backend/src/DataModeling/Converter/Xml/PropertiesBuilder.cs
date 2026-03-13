using System.Collections.Generic;
using System.Linq;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Converter.Xml;

/// <summary>
/// Class for building Properties on <see cref="JsonSchemaBuilder"/>.
/// </summary>
internal class PropertiesBuilder
{
    private readonly List<(string Name, JsonSchemaBuilder Schema, bool Required)> _properties =
        new List<(string Name, JsonSchemaBuilder Schema, bool Required)>();

    /// <summary>
    /// Adds property with a builder.
    /// </summary>
    public void Add(string name, JsonSchemaBuilder schema, bool required)
    {
        _properties.Add((name, schema, required));
    }

    /// <summary>
    /// Adds property with a built schema (converts to builder).
    /// </summary>
    public void Add(string name, JsonSchema schema, bool required)
    {
        _properties.Add((name, RebuildAsBuilder(schema), required));
    }

    /// <summary>
    /// Adding properties creation step in provided <paramref name="stepBuilder"/>
    /// </summary>
    public void AddCurrentPropertiesToStep(StepsBuilder stepBuilder)
    {
        if (_properties.Count > 0)
        {
            var currentProperties = _properties.ToDictionary(prop => prop.Name, prop => prop.Schema);
            string[] required = _properties.Where(prop => prop.Required).Select(prop => prop.Name).ToArray();
            stepBuilder.Add(b =>
            {
                b.Properties(currentProperties);
                if (required.Length > 0)
                {
                    b.Required(required);
                }
            });
            _properties.Clear();
        }
    }

    /// <summary>
    /// Builds the properties on provided <paramref name="builder"/>.
    /// </summary>
    public void Build(JsonSchemaBuilder builder)
    {
        if (_properties.Count > 0)
        {
            var properties = _properties.ToDictionary(prop => prop.Name, prop => prop.Schema);
            string[] required = _properties.Where(prop => prop.Required).Select(prop => prop.Name).ToArray();

            builder.Properties(properties);
            if (required.Length > 0)
            {
                builder.Required(required);
            }

            _properties.Clear();
        }
    }

    private static JsonSchemaBuilder RebuildAsBuilder(JsonSchema schema)
    {
        var builder = new JsonSchemaBuilder();
        var keywords = schema.Root?.Keywords;
        if (keywords != null)
        {
            foreach (var kd in keywords)
            {
                builder.Add(kd.Handler.Name, System.Text.Json.Nodes.JsonNode.Parse(kd.RawValue.GetRawText()));
            }
        }

        return builder;
    }
}
