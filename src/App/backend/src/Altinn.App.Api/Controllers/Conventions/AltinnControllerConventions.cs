using Altinn.App.Api.Controllers.Attributes;
using Microsoft.AspNetCore.Mvc.ApplicationModels;

namespace Altinn.App.Api.Controllers.Conventions;

internal class AltinnControllerConventions : IControllerModelConvention
{
    public void Apply(ControllerModel controller)
    {
        controller.Filters.Add(new JsonSettingsNameAttribute(JsonSettingNames.AltinnApi));
    }
}
