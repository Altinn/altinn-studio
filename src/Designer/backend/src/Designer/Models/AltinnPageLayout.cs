using System;
using System.Linq;
using System.Text.Json.Nodes;
using Altinn.App.Core.Helpers;

namespace Altinn.Studio.Designer.Models
{
    public class AltinnPageLayout
    {
        private const string LayoutSchemaUrl =
            "https://altinncdn.no/schemas/json/layout/layout.schema.v1.json";
        private readonly Random _random = new();

        public JsonObject Structure { get; set; }

        public AltinnPageLayout()
        {
            Structure = new()
            {
                ["$schema"] = LayoutSchemaUrl,
                ["data"] = new JsonObject { ["layout"] = new JsonArray([]) },
            };
        }

        public AltinnPageLayout(JsonObject structure)
        {
            Structure = structure;
        }

        string GenerateRandomId(int length = 6)
        {
            const string Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890";
            return new string(
                [.. Enumerable.Repeat(Chars, length).Select(s => s[_random.Next(s.Length)])]
            );
        }

        public bool HasComponentOfType(string type)
        {
            JsonArray components = Structure["data"]["layout"] as JsonArray;
            return components.Any((component) => component["type"].GetValue<string>().Equals(type));
        }

        public AltinnPageLayout WithNavigationButtons()
        {
            (Structure["data"]["layout"] as JsonArray).Add(
                new JsonObject()
                {
                    ["id"] = "NavigationButtons-" + GenerateRandomId(),
                    ["showBackButton"] = true,
                    ["textResourceBindings"] = { },
                    ["type"] = "NavigationButtons",
                }
            );
            return this;
        }

        public AltinnPageLayout RemoveAllComponentsOfType(string type)
        {
            JsonArray components = Structure["data"]["layout"] as JsonArray;
            components?.RemoveAll((component) => component["type"].GetValue<string>().Equals(type));
            return this;
        }
    }
}
