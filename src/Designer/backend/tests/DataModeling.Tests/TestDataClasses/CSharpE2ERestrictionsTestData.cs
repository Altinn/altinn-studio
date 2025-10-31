using System.Collections;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;

namespace DataModeling.Tests.TestDataClasses;

[ExcludeFromCodeCoverage]
public class CSharpE2ERestrictionsTestData : IEnumerable<object[]>
{
    public IEnumerator<object[]> GetEnumerator()
    {
        yield return ["Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "t1", "string", "[MinLength(5)]"];
        yield return ["Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "t1", "string", "[MaxLength(20)]"];
        yield return ["Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "t2", "string", "[MinLength(10)]"];
        yield return ["Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "t2", "string", "[MaxLength(10)]"];
        yield return ["Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "t2", "string", "[Required]"];
        yield return ["Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "t4", "string", @"[RegularExpression(@""^\d\.\d\.\d$"")]"];
        yield return ["Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "n1", "decimal?", @"[RegularExpression(@""^-?(([0-9]){1}(\.)?){0,10}$"")]"];
        yield return ["Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "n1", "decimal?", "[Range(-100d, 100d)]"];
        yield return ["Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "n1", "decimal?", "[Required]"];
        yield return ["Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "i1", "int?", @"[RegularExpression(@""^-?[0-9]{0,10}$"")]"];
        yield return ["Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "i1", "int?", "[Required]"];
        yield return ["Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "i2", "decimal?", @"[RegularExpression(@""^-?[0-9]{0,10}$"")]"];
        yield return ["Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "i2", "decimal?", "[Required]"];
        yield return ["Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "nonPrimitive", "string", @"[RegularExpression(@""[0-9]+"")]"];
        yield return ["Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "nonPrimitive", "string", "[MinLength(5)]"];
        yield return ["Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "nonPrimitive", "string", "[MaxLength(20)]"];
        yield return ["Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "intRangeWithoutLimits", "int?", "[Range(Int32.MinValue, Int32.MaxValue)]"];
        yield return ["Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "intRangeWithLimits", "int?", "[Range(-100, 100)]"];
        yield return ["Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "intRangeLeftLimit", "int?", "[Range(-100, Int32.MaxValue)]"];
        yield return ["Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "intRangeRightLimit", "int?", "[Range(Int32.MinValue, 100)]"];
        yield return ["Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "integerRangeWithoutLimits", "decimal?", "[Range(Double.MinValue, Double.MaxValue)]"];
        yield return ["Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "integerRangeWithLimits", "decimal?", "[Range(-100d, 100d)]"];
        yield return ["Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "integerRangeLeftLimit", "decimal?", "[Range(-100d, Double.MaxValue)]"];
        yield return ["Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "integerRangeRightLimit", "decimal?", "[Range(Double.MinValue, 100d)]"];
        yield return ["Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "longRangeWithoutLimits", "long?", "[Range(Int64.MinValue, Int64.MaxValue)]"];
        yield return ["Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "longRangeWithLimits", "long?", "[Range(-100, 100)]"];
        yield return ["Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "longRangeLeftLimit", "long?", "[Range(-100, Int64.MaxValue)]"];
        yield return ["Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "longRangeRightLimit", "long?", "[Range(Int64.MinValue, 100)]"];
        yield return ["Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "decimalRangeWithLimits", "decimal?", "[Range(-100.0, 100.0)]"];
        yield return ["Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "decimalRangeLeftLimit", "decimal?", "[Range(-100.0, Double.MaxValue)]"];
        yield return ["Model/XmlSchema/General/SimpleTypeRestrictionsExtended.xsd", "decimalRangeRightLimit", "decimal?", "[Range(Double.MinValue, 100.0d)]"];
    }

    IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
}
