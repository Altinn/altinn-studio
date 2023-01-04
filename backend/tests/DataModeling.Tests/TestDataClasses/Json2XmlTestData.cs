using System.Collections;
using System.Collections.Generic;

namespace DataModeling.Tests.TestDataClasses;

public class Json2XmlTestData: IEnumerable<object[]>
{
    public IEnumerator<object[]> GetEnumerator()
    {
        yield return new object[] { "Model/JsonSchema/AltinnAnnotation.json", "Model/XmlSchema/AltinnAnnotation.xsd" };
        yield return new object[] { "Model/JsonSchema/General/BuiltinTypes.json", "Model/XmlSchema/General/BuiltinTypes.xsd" };
        yield return new object[] { "Model/JsonSchema/General/SimpleTypeRestrictions.json", "Model/XmlSchema/General/SimpleTypeRestrictions.xsd" };
        yield return new object[] { "Model/JsonSchema/General/SimpleSequence.json", "Model/XmlSchema/General/SimpleSequence.xsd" };
        yield return new object[] { "Model/JsonSchema/General/SimpleContentExtension.json", "Model/XmlSchema/General/SimpleContentExtension.xsd" };
        yield return new object[] { "Model/JsonSchema/General/SimpleContentRestriction.json", "Model/XmlSchema/General/SimpleContentRestriction.fromJson.xsd" };
        yield return new object[] { "Model/JsonSchema/General/SchemaExampleWithTargetNamespace.json", "Model/XmlSchema/General/SchemaExampleWithTargetNamespace.xsd" };

        // Following tests are skipped:
        // yield return new object[] { "Model/JsonSchema/General/SimpleAll.json", "Model/XmlSchema/General/SimpleAll.xsd" }; // "XsdStructureKeyword not supported. We default to sequence, and currently dont' support all. #6888"
        // yield return new object[] { "Model/JsonSchema/General/Any.json", "Model/XmlSchema/General/Any.xsd" }; // "Missing support for Any (element). AnyAttribute is implemented. #6885"
        // yield return new object[] { "Model/JsonSchema/General/Attributes.json", "Model/XmlSchema/General/Attributes.xsd" }; // "Unhandled attributes ends up on schema, not on the root element. #6890"
        // yield return new object[] { "Model/JsonSchema/SimpleChoice.json", "Model/XmlSchema/SimpleChoice.xsd" }; // "Choice not supported for now, and probably won't be because of unecessary complexity."
        // yield return new object[] { "Model/JsonSchema/NestedChoice.json", "Model/XmlSchema/NestedChoice.xsd" }; // "Needs analyzing"
        // yield return new object[] { "Model/JsonSchema/NestedArrays.json", "Model/XmlSchema/NestedArrays.xsd" }; // "Needs analyzing"
        // yield return new object[] { "Model/JsonSchema/NestedWithOptionalChoice.json", "Model/XmlSchema/NestedWithOptionalChoice.xsd" }; // "Needs analyzing"
        // yield return new object[] { "Model/JsonSchema/NestedWithArrayChoice.json", "Model/XmlSchema/NestedWithArrayChoice.xsd" }; // "Needs analyzing"
        // yield return new object[] { "Model/JsonSchema/General/ComplexContentExtension.json", "Model/XmlSchema/General/ComplexContentExtension.xsd" }; // "Attribute a1 is placed outside the complex content extension ref. #6869"
        // yield return new object[] { "Model/JsonSchema/General/ComplexContentRestriction.json", "Model/XmlSchema/General/ComplexContentRestriction.xsd" }; // "Needs analyzing"
        // yield return new object[] { "Model/JsonSchema/General/ComplexSchema.json", "Model/XmlSchema/General/ComplexSchema.xsd" }; //  "Fails to recognize array type and support xsd:list #6891
        // yield return new object[] { "Model/JsonSchema/General/Definitions.json", "Model/XmlSchema/General/Definitions.xsd" }; // "We currently don't support group element. Ref. #6892"
        // yield return new object[] { "Model/JsonSchema/General/ElementAnnotation.json", "Model/XmlSchema/General/ElementAnnotation.xsd" }; // "The provided example is an OR schema which is currently not supported."
        // yield return new object[] { "Model/JsonSchema/General/NestedSequence.json", "Model/XmlSchema/General/NestedSequence.xsd" }; // "Nested sequence is currently not supported while maintaing the sequences. #6894"
        // yield return new object[] { "Model/JsonSchema/General/NestedSequences.json", "Model/XmlSchema/General/NestedSequences.xsd" }; // "Nested sequence is currently not supported while maintaing the sequences. #6894"
        // yield return new object[] { "Model/JsonSchema/General/NestedWithOptionalSequence.json", "Model/XmlSchema/General/NestedWithOptionalSequence.xsd" }; //  "Nested sequence is currently not supported while maintaing the sequences. #6894"
        // yield return new object[] { "Model/JsonSchema/General/NestedWithArraySequence.json", "Model/XmlSchema/General/NestedWithArraySequence.xsd" }; //  "Nested sequence is currently not supported while maintaing the sequences. #6894"
        // yield return new object[] { "Model/JsonSchema/General/SimpleTypeList.json", "Model/XmlSchema/General/SimpleTypeList.xsd" }; // "We currently don't support xsd:list #6891"
    }

    IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
}
