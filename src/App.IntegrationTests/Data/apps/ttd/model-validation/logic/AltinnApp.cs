using System;
using Altinn.App.Core.Internal.AppModel;

#pragma warning disable SA1300 // Element should begin with upper-case letter
namespace App.IntegrationTests.Mocks.Apps.ttd.model_validation
#pragma warning restore SA1300 // Element should begin with upper-case letter
{
    public class AltinnApp : IAppModel
    {
        public object Create(string classRef)
        {
            Type appType = Type.GetType(classRef);
            return Activator.CreateInstance(appType);
        }

        public Type GetModelType(string classRef)
        {
            return Type.GetType(classRef);
        }
    }
}
