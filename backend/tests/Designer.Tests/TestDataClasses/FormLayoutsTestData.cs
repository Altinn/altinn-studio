using System.Collections;
using System.Collections.Generic;

namespace Designer.Tests.TestDataClasses;

public class FormLayoutsTestData : IEnumerable<object[]>
{
    public IEnumerator<object[]> GetEnumerator()
    {
        yield return new object[] { "ttd", "empty-app", "testUser", "empty-layout-set", "TestData/App/ui/layoutWithUnknownProperties.json" };
        yield return new object[] { "ttd", "empty-app", "testUser", "empty-layout-set", "TestData/App/ui/changename/layouts/form.json" };
        yield return new object[] { "ttd", "empty-app", "testUser", "empty-layout-set", "TestData/App/ui/changename/layouts/summary.json" };
        yield return new object[] { "ttd", "empty-app", "testUser", "empty-layout-set", "TestData/App/ui/datalist/layouts/formLayout.json" };
        yield return new object[] { "ttd", "empty-app", "testUser", "empty-layout-set", "TestData/App/ui/datalist/layouts/summary.json" };
        yield return new object[] { "ttd", "empty-app", "testUser", "empty-layout-set", "TestData/App/ui/group/layouts/hide.json" };
        yield return new object[] { "ttd", "empty-app", "testUser", "empty-layout-set", "TestData/App/ui/group/layouts/prefill.json" };
        yield return new object[] { "ttd", "empty-app", "testUser", "empty-layout-set", "TestData/App/ui/group/layouts/repeating.json" };
        yield return new object[] { "ttd", "empty-app", "testUser", "empty-layout-set", "TestData/App/ui/group/layouts/summary.json" };
        yield return new object[] { "ttd", "empty-app", "testUser", "empty-layout-set", "TestData/App/ui/likert/layouts/formLayout.json" };
        yield return new object[] { "ttd", "empty-app", "testUser", "empty-layout-set", "TestData/App/ui/message/layouts/formLayout.json" };
        yield return new object[] { "ttd", "empty-app", "testUser", null, "TestData/App/ui/layoutWithUnknownProperties.json" };
        yield return new object[] { "ttd", "empty-app", "testUser", null, "TestData/App/ui/changename/layouts/form.json" };
        yield return new object[] { "ttd", "empty-app", "testUser", null, "TestData/App/ui/changename/layouts/summary.json" };
        yield return new object[] { "ttd", "empty-app", "testUser", null, "TestData/App/ui/datalist/layouts/formLayout.json" };
        yield return new object[] { "ttd", "empty-app", "testUser", null, "TestData/App/ui/datalist/layouts/summary.json" };
        yield return new object[] { "ttd", "empty-app", "testUser", null, "TestData/App/ui/group/layouts/hide.json" };
        yield return new object[] { "ttd", "empty-app", "testUser", null, "TestData/App/ui/group/layouts/prefill.json" };
        yield return new object[] { "ttd", "empty-app", "testUser", null, "TestData/App/ui/group/layouts/repeating.json" };
        yield return new object[] { "ttd", "empty-app", "testUser", null, "TestData/App/ui/group/layouts/summary.json" };
        yield return new object[] { "ttd", "empty-app", "testUser", null, "TestData/App/ui/likert/layouts/formLayout.json" };
        yield return new object[] { "ttd", "empty-app", "testUser", null, "TestData/App/ui/message/layouts/formLayout.json" };
    }

    IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
}
