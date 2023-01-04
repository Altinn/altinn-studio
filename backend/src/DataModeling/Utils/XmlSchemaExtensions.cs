using System;
using System.Collections.Generic;
using System.Xml.Schema;

namespace Altinn.Studio.DataModeling.Utils;

/// <summary>
/// Extension methods for working with XmlSchema
/// </summary>
public static class XmlSchemaExtensions
{
    /// <summary>
    /// Calculates Xsd attributes.
    /// </summary>
    /// <param name="schema">An <see cref="XmlSchema"/> from which attributes are calculated.</param>
    /// <returns>Xsd attributes from schema.</returns>
    public static IEnumerable<(string Key, string Value)> XsdAttributes(this XmlSchema schema)
    {
        var xsdAttributes = new List<(string, string)>
        {
            (nameof(XmlSchema.AttributeFormDefault), schema.AttributeFormDefault.ToString()),
            (nameof(XmlSchema.ElementFormDefault), schema.ElementFormDefault.ToString()),
            (nameof(XmlSchema.BlockDefault), schema.BlockDefault.ToString()),
            (nameof(XmlSchema.FinalDefault), schema.FinalDefault.ToString())
        };

        if (!string.IsNullOrWhiteSpace(schema.TargetNamespace))
        {
            xsdAttributes.Add((nameof(XmlSchema.TargetNamespace), schema.TargetNamespace));
        }

        return xsdAttributes;
    }
}
