using System;
using System.Collections.Generic;
using System.Linq;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Converter.Xml;

/// <summary>
/// Class used for building <see cref="AllOfKeyword"/> based on steps added.
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
    /// Each added step will be applied to newly created <see cref="JsonSchemaBuilder"/> which will be used for creating <see cref="AllOfKeyword"/> on provided <paramref name="builder"/>
    /// </summary>
    /// <param name="builder">A <see cref="JsonSchemaBuilder"/> on which <see cref="AllOfKeyword"/> will be generated with all steps mapped to <see cref="JsonSchemaBuilder"/>.</param>
    public void BuildWithAllOf(JsonSchemaBuilder builder)
    {
        builder.AllOf(_steps.Select(step =>
        {
            JsonSchemaBuilder stepBuilder = new JsonSchemaBuilder();
            step(stepBuilder);
            return stepBuilder.Build();
        }));
    }
}
