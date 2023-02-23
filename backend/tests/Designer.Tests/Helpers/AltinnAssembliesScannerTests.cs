using System.Linq;
using Altinn.Studio.Designer.Helpers;
using Microsoft.Extensions.DependencyModel;
using Xunit;

namespace Designer.Tests.Helpers
{
    public class AltinnAssembliesScannerTests
    {
        [Fact]
        public void AssemblyScanning_ShouldReturnCorrectTypes()
        {
            AltinnAssembliesScanner.DependencyContext = DependencyContext.Load(GetType().Assembly);

            var types = AltinnAssembliesScanner.GetTypesAssignedFrom<ITestMarker>().ToList();

            Assert.True(types.All(t => typeof(ITestMarker).IsAssignableFrom(t)));
            Assert.Contains(types, t => t == typeof(TestClass1));
            Assert.Contains(types, t => t == typeof(TestClass2));
            Assert.DoesNotContain(types, t => t == typeof(ITestMarker));
        }

        public interface ITestMarker
        {
        }
        public class TestClass1 : ITestMarker
        {
        }
        public class TestClass2 : ITestMarker
        {
        }
    }
}
