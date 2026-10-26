using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Altinn.Studio.Designer.Migrations
{
    /// <summary>
    /// Brings stored SMS numbers to the format that PhoneNumber.TryNormalize gives new ones, since Altinn Notifications
    /// rejects numbers without a country code.
    /// </summary>
    public partial class NormalizeSmsContactMethodPhoneNumbers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                UPDATE designer.contact_methods
                SET value = regexp_replace(
                    regexp_replace(regexp_replace(value, '[\s-]', '', 'g'), '^00', '+'),
                    '^([49][0-9]{7})$',
                    '+47\1'
                )
                -- ContactMethodType.Sms
                WHERE method_type = 1;
                """
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // The original formatting is not needed to send notifications, so it is not restored
        }
    }
}
