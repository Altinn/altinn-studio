using System.Collections;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;

namespace DataModeling.Tests.TestDataClasses;

[ExcludeFromCodeCoverage]
public class CSharpE2ERestrictionsTestData : IEnumerable<object[]>
{
    public IEnumerator<object[]> GetEnumerator()
    {
        yield return new object[] { "Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "t1", "string", "[MinLength(5)]" };
        yield return new object[] { "Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "t1", "string", "[MaxLength(20)]" };
        yield return new object[] { "Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "t2", "string", "[MinLength(10)]" };
        yield return new object[] { "Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "t2", "string", "[MaxLength(10)]" };
        yield return new object[] { "Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "t4", "string", @"[RegularExpression(@""^\d\.\d\.\d$"")]" };
        yield return new object[] { "Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "n1", "decimal?", @"[RegularExpression(@""^-?(([0-9]){1}(\.)?){0,10}$"")]" };
        yield return new object[] { "Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "n1", "decimal?", @"[Range(-100, 100)]" };
        yield return new object[] { "Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "n1", "decimal?", "[Required]" };
        yield return new object[] { "Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "i1", "int?", @"[RegularExpression(@""^-?[0-9]{0,10}$"")]" };
        yield return new object[] { "Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "i1", "int?", "[Required]" };
        yield return new object[] { "Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "i2", "decimal?", @"[RegularExpression(@""^-?[0-9]{0,10}$"")]" };
        yield return new object[] { "Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "i2", "decimal?", "[Required]" };
        yield return new object[] { "Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "nonPrimitive", "string", @"[RegularExpression(@""[0-9]+"")]" };
        yield return new object[] { "Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "nonPrimitive", "string", "[MinLength(5)]" };
        yield return new object[] { "Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "nonPrimitive", "string", "[MaxLength(20)]" };
    }

    IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
}
