using System;
using Altinn.App.Core.Internal.AppModel;

#pragma warning disable SA1300 // Element should begin with upper-case letter
#pragma warning disable IDE0130 // Namespace does not match folder structure
namespace App.IntegrationTests.Mocks.Apps.dibk.nabovarsel
#pragma warning restore IDE0130 // Namespace does not match folder structure
#pragma warning restore SA1300 // Element should begin with upper-case letter
{
    public class AltinnApp : IAppModel
    {
        public object Create(string classRef)
        {
            var appType = Type.GetType(classRef);
            return Activator.CreateInstance(appType);
        }

        public Type GetModelType(string classRef)
        {
            return Type.GetType(classRef);
        }
    }
}
