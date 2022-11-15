using System.Collections;
using System.Collections.Generic;

namespace Designer.Tests.Factories.ModelFactory.DataClasses;

public class ValidationTestData : IEnumerable<object[]>
{
    public IEnumerator<object[]> GetEnumerator()
    {
        yield return new object[] { "Model/Xsd/Gitea/aal-vedlegg.xsd" };
    }

    IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
}
