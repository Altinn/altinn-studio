using System.Collections.Generic;
using System.Linq;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Converter.Xml;

/// <summary>
/// Class for building Properties on <see cref="JsonSchemaBuilder"/>.
/// </summary>
internal class PropertiesBuilder
{
    private readonly List<(string Name, JsonSchema Schema, bool Required)> _properties = new List<(string Name, JsonSchema Schema, bool Required)>();

    /// <summary>
    /// Adds property.
    /// </summary>
    /// <param name="name">Name of the property.</param>
    /// <param name="schema">Json schema used for building property.</param>
    /// <param name="required">A <see cref="bool"/> indicating if property is required.</param>
    public void Add(string name, JsonSchema schema, bool required)
    {
        _properties.Add((name, schema, required));
    }

    /// <summary>
    /// Adding properties creation step in provided <paramref name="stepBuilder"/>
    /// </summary>
    /// <param name="stepBuilder">A <see cref="StepsBuilder"/> on which properties creation step will be added based on previously added properties.</param>
    public void AddCurrentPropertiesToStep(StepsBuilder stepBuilder)
    {
        if (_properties.Count > 0)
        {
            (string Name, JsonSchema Schema)[] currentProperties = _properties.Select(prop => (prop.Name, prop.Schema)).ToArray();
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
    /// <param name="builder">Adds properties on provided <see cref="JsonSchemaBuilder"/>.</param>
    public void Build(JsonSchemaBuilder builder)
    {
        if (_properties.Count > 0)
        {
            (string Name, JsonSchema Schema)[] properties = _properties.Select(prop => (prop.Name, prop.Schema)).ToArray();
            string[] required = _properties.Where(prop => prop.Required).Select(prop => prop.Name).ToArray();

            builder.Properties(properties);
            if (required.Length > 0)
            {
                builder.Required(required);
            }

            _properties.Clear();
        }
    }
}
