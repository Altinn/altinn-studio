using System.Collections;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;

namespace Designer.Tests.Factories.ModelFactory.DataClasses;

[ExcludeFromCodeCoverage]
public class CSharpE2ERestrictionsTestData: IEnumerable<object[]>
{
    public IEnumerator<object[]> GetEnumerator()
    {
        yield return new object[] { "Model/Xsd/SimpleTypeRestrictions.xsd", "t1", "string", "[MinLength(5)]" };
        yield return new object[] { "Model/Xsd/SimpleTypeRestrictions.xsd", "t1", "string", "[MaxLength(20)]" };
        yield return new object[] { "Model/Xsd/SimpleTypeRestrictions.xsd", "t2", "string", "[MinLength(10)]" };
        yield return new object[] { "Model/Xsd/SimpleTypeRestrictions.xsd", "t2", "string", "[MaxLength(10)]" };
        yield return new object[] { "Model/Xsd/SimpleTypeRestrictions.xsd", "t4", "string", @"[RegularExpression(@""^\d\.\d\.\d$"")]" };
        yield return new object[] { "Model/Xsd/SimpleTypeRestrictions.xsd", "n1", "decimal", @"[RegularExpression(@""^-?(([0-9]){1}(\.)?){0,10}$"")]" };
        yield return new object[] { "Model/Xsd/SimpleTypeRestrictions.xsd", "n1", "decimal", @"[Range(-100, 100)]" };
        yield return new object[] { "Model/Xsd/SimpleTypeRestrictions.xsd", "i1", "int", @"[RegularExpression(@""^-?[0-9]{0,10}$"")]" };
        yield return new object[] { "Model/Xsd/SimpleTypeRestrictions.xsd", "i2", "decimal", @"[RegularExpression(@""^-?[0-9]{0,10}$"")]" };
    }

    IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
}
