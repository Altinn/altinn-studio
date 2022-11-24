using System.Collections;
using System.Collections.Generic;

namespace DataModeling.Tests.TestDataClasses;

public class Xml2JsonTestData: IEnumerable<object[]>
{
    public IEnumerator<object[]> GetEnumerator()
    {
                yield return new object[] { "Model/XmlSchema/General/SimpleAll.xsd", "Model/JsonSchema/General/SimpleAll.json", "Test to verify conversion from XSD to JSON Schema - feature: SimpleAll" };
                yield return new object[] { "Model/XmlSchema/AltinnAnnotation.xsd", "Model/JsonSchema/AltinnAnnotation.json", "Test to verify conversion from XSD to JSON Schema - feature: AltinnAnnotation" };
                yield return new object[] { "Model/XmlSchema/General/Any.xsd", "Model/JsonSchema/General/Any.json", "Test to verify conversion from XSD to JSON Schema - feature: Any" };
                yield return new object[] { "Model/XmlSchema/General/Attributes.xsd", "Model/JsonSchema/General/Attributes.json", "Test to verify conversion from XSD to JSON Schema - feature: Attributes" };
                yield return new object[] { "Model/XmlSchema/General/BuiltinTypes.xsd", "Model/JsonSchema/General/BuiltinTypes.json", "Test to verify conversion from XSD to JSON Schema - feature: BuiltinTypes" };
                yield return new object[] { "Model/XmlSchema/General/SimpleChoice.xsd", "Model/JsonSchema/General/SimpleChoice.json", "Test to verify conversion from XSD to JSON Schema - feature: SimpleChoice" };
                yield return new object[] { "Model/XmlSchema/General/NestedChoice.xsd", "Model/JsonSchema/General/NestedChoice.json", "Test to verify conversion from XSD to JSON Schema - feature: NestedChoice" };
                yield return new object[] { "Model/XmlSchema/General/NestedWithOptionalChoice.xsd", "Model/JsonSchema/General/NestedWithOptionalChoice.json", "Test to verify conversion from XSD to JSON Schema - feature: NestedWithOptionalChoice" };
                yield return new object[] { "Model/XmlSchema/General/NestedWithArrayChoice.xsd", "Model/JsonSchema/General/NestedWithArrayChoice.json", "Test to verify conversion from XSD to JSON Schema - feature: NestedWithArrayChoice" };
                yield return new object[] { "Model/XmlSchema/General/ComplexContentExtension.xsd", "Model/JsonSchema/General/ComplexContentExtension.json", "Test to verify conversion from XSD to JSON Schema - feature: ComplexContentExtension" };
                yield return new object[] { "Model/XmlSchema/General/ComplexContentRestriction.xsd", "Model/JsonSchema/General/ComplexContentRestriction.json", "Test to verify conversion from XSD to JSON Schema - feature: ComplexContentRestriction" };
                yield return new object[] { "Model/XmlSchema/General/ComplexSchema.xsd", "Model/JsonSchema/General/ComplexSchema.json", "Test to verify conversion from XSD to JSON Schema - feature: ComplexSchema" };
                yield return new object[] { "Model/XmlSchema/General/Definitions.xsd", "Model/JsonSchema/General/Definitions.json", "Test to verify conversion from XSD to JSON Schema - feature: Definitions" };
                yield return new object[] { "Model/XmlSchema/General/ElementAnnotation.xsd", "Model/JsonSchema/General/ElementAnnotation.json", "Test to verify conversion from XSD to JSON Schema - feature: ElementAnnotation" };
                yield return new object[] { "Model/XmlSchema/General/SimpleTypeRestrictions.xsd", "Model/JsonSchema/General/SimpleTypeRestrictions.json", "Test to verify conversion from XSD to JSON Schema - feature: SimpleTypeRestrictions" };
                yield return new object[] { "Model/XmlSchema/General/SimpleSequence.xsd", "Model/JsonSchema/General/SimpleSequence.json", "Test to verify conversion from XSD to JSON Schema - feature: SimpleSequence" };
                yield return new object[] { "Model/XmlSchema/General/NestedArrays.xsd", "Model/JsonSchema/General/NestedArrays.json", "Test to verify conversion from XSD to JSON Schema - feature: NestedArrays" };
                yield return new object[] { "Model/XmlSchema/General/NestedSequence.xsd", "Model/JsonSchema/General/NestedSequence.json", "Test to verify conversion from XSD to JSON Schema - feature: NestedSequence" };
                yield return new object[] { "Model/XmlSchema/General/NestedSequences.xsd", "Model/JsonSchema/General/NestedSequences.json", "Test to verify conversion from XSD to JSON Schema - feature: NestedSequences" };
                yield return new object[] { "Model/XmlSchema/General/InterleavedNestedSequences.xsd", "Model/JsonSchema/General/InterleavedNestedSequences.json", "Test to verify conversion from XSD to JSON Schema - feature: InterleavedNestedSequences" };
                yield return new object[] { "Model/XmlSchema/General/NestedWithOptionalSequence.xsd", "Model/JsonSchema/General/NestedWithOptionalSequence.json", "Test to verify conversion from XSD to JSON Schema - feature: NestedWithOptionalSequence" };
                yield return new object[] { "Model/XmlSchema/General/NestedWithArraySequence.xsd", "Model/JsonSchema/General/NestedWithArraySequence.json", "Test to verify conversion from XSD to JSON Schema - feature: NestedWithArraySequence" };
                yield return new object[] { "Model/XmlSchema/General/SimpleContentExtension.xsd", "Model/JsonSchema/General/SimpleContentExtension.json", "Test to verify conversion from XSD to JSON Schema - feature: SimpleContentExtension" };
                yield return new object[] { "Model/XmlSchema/General/SimpleContentRestriction.xsd", "Model/JsonSchema/General/SimpleContentRestriction.json", "Test to verify conversion from XSD to JSON Schema - feature: SimpleContentRestriction" };
                yield return new object[] { "Model/XmlSchema/General/SimpleTypeList.xsd", "Model/JsonSchema/General/SimpleTypeList.json", "Test to verify conversion from XSD to JSON Schema - feature: SimpleTypeList" };
                yield return new object[] { "Model/XmlSchema/Seres/SeresWithAttributes.xsd", "Model/JsonSchema/Seres/SeresWithAttributes.json", "Test to verify conversion from XSD to JSON Schema - feature: SeresWithAttributes" };
                yield return new object[] { "Model/XmlSchema/Seres/SeresWithAnyAttribute.xsd", "Model/JsonSchema/Seres/SeresWithAnyAttribute.json", "Test to verify conversion from XSD to JSON Schema - feature: SeresWithAnyAttribute" };
                yield return new object[] { "Model/XmlSchema/General/NillableAttribute.xsd", "Model/JsonSchema/General/NillableAttribute.json", "Test to verify conversion from XSD to JSON Schema - feature: NillableAttribute" };
                yield return new object[] { "Model/XmlSchema/Seres/SeresSimpleContentRestriction.xsd", "Model/JsonSchema/Seres/SeresSimpleContentRestriction.json", "Test to verify conversion from XSD to JSON Schema - feature: SeresSimpleContentRestriction" };
                yield return new object[] { "Model/XmlSchema/Seres/SeresArray.xsd", "Model/JsonSchema/Seres/SeresArray.json", "Test to verify conversion from XSD to JSON Schema - feature: arrays" };
                yield return new object[] { "Model/XmlSchema/Seres/SeresComplexType.xsd", "Model/JsonSchema/Seres/SeresComplexType.json", "Test to verify conversion from XSD to JSON Schema - feature: arrays" };
                yield return new object[] { "Model/XmlSchema/Seres/SeresComplexContentExtension.xsd", "Model/JsonSchema/Seres/SeresComplexContentExtension.json", "Test to verify conversion from XSD to JSON Schema - feature: complex content extension" };
                yield return new object[] { "Model/XmlSchema/Seres/SeresWithSpecifiedAndAnyAttributes.xsd", "Model/JsonSchema/Seres/SeresWithSpecifiedAndAnyAttributes.json", "Test to verify conversion from XSD to JSON Schema - feature: SeresWithSpecifiedAndAnyAttributes" };
                yield return new object[] { "Model/XmlSchema/Seres/SeresNillable.xsd", "Model/JsonSchema/Seres/SeresNillable.json", "Test to verify conversion from XSD to JSON Schema - feature: Nillable ellements" };
                yield return new object[] { "Model/XmlSchema/Seres/SeresSimpleTypeRestrictions.xsd", "Model/JsonSchema/Seres/SeresSimpleTypeRestrictions.json", "Test to verify conversion from XSD to JSON Schema - feature: SeresSimpleTypeRestrictions" };
                yield return new object[] { "Model/XmlSchema/General/SchemaExampleWithTargetNamespace.xsd", "Model/JsonSchema/General/SchemaExampleWithTargetNamespace.json", "Test to verify conversion from XSD to JSON Schema - feature: SchemaWithTargetNamespace" };
    }

    IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
}
