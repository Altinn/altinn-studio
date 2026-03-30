using System;
using System.Collections.Generic;
using System.Linq;
using Altinn.Studio.DataModeling.Json.Keywords;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Converter.Xml;

/// <summary>
/// Class used for building AllOf keyword based on steps added.
/// </summary>
internal class StepsBuilder
{
    private readonly List<Action<JsonSchemaBuilder>> _steps = new List<Action<JsonSchemaBuilder>>();

    /// <summary>
    /// Adding step in the list.
    /// </summary>
    /// <param name="step">An <see cref="Action"/> Which will be applied to newly created <see cref="JsonSchemaBuilder"/>.</param>
    public void Add(Action<JsonSchemaBuilder> step)
    {
        _steps.Add(step);
    }

    /// <summary>
    /// Builds AllOf keyword with all steps added.
    /// </summary>
    /// <param name="builder">A <see cref="JsonSchemaBuilder"/> on which AllOf will be generated with all steps mapped to builders.</param>
    public void BuildWithAllOf(JsonSchemaBuilder builder)
    {
        builder.AllOf(
            _steps.Select(step =>
            {
                JsonSchemaBuilder stepBuilder = new JsonSchemaBuilder();
                step(stepBuilder);
                return stepBuilder;
            })
        );
    }
}
