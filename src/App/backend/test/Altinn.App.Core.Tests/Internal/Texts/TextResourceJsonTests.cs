using Altinn.App.Core.Internal.Texts;

namespace Altinn.App.Core.Tests.Internal.Texts;

public class TextResourceJsonTests
{
    [Fact]
    public void ToVariable_GivesTheDataSourceKeyAndDefaultValue()
    {
        (TextVariableSource Source, string DataSource, string Key, string? DefaultValue)[] cases =
        [
            (
                new TextVariableSource.CustomTextParameter("name") { DefaultValue = "" },
                "customTextParameters",
                "name",
                ""
            ),
            (new TextVariableSource.Text("appName") { DefaultValue = "Altinn" }, "text", "appName", "Altinn"),
            (new TextVariableSource.DataModel("model", "person.name"), "dataModel.model", "person.name", null),
            (new TextVariableSource.DataModel(null, "person.name"), "dataModel.default", "person.name", null),
            (
                new TextVariableSource.InstanceContext(InstanceContextKey.InstanceOwnerPartyId),
                "instanceContext",
                "instanceOwnerPartyId",
                null
            ),
            (new TextVariableSource.InstanceContext(InstanceContextKey.AppId), "instanceContext", "appId", null),
            (
                new TextVariableSource.InstanceContext(InstanceContextKey.InstanceId),
                "instanceContext",
                "instanceId",
                null
            ),
            (
                new TextVariableSource.InstanceContext(InstanceContextKey.InstanceOwnerPartyType),
                "instanceContext",
                "instanceOwnerPartyType",
                null
            ),
            (new TextVariableSource.ApplicationSetting("homeLink"), "applicationSettings", "homeLink", null),
            (new TextVariableSource.Unsupported("unknown", "key") { DefaultValue = "x" }, "unknown", "key", "x"),
        ];

        Assert.All(
            cases,
            @case =>
            {
                var variable = TextResourceJson.ToVariable(@case.Source);
                Assert.Equal(
                    (@case.DataSource, @case.Key, @case.DefaultValue),
                    (variable.DataSource, variable.Key, variable.DefaultValue)
                );
            }
        );
    }
}
