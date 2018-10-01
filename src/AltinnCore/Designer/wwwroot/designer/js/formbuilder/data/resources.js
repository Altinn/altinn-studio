define([
       "jquery"
], function ($) {
    var that = this;
    return {
        initialize: function () {
            that = this;
        },
        getResources: function (org, service, edition, callback) {
            console.log("resources.js - Retrieving resources: org='" + org + "', service='" + service + "', edition='" + edition + "'.");
            if (!org || !service || !edition) {
                alert("Kan ikke hente ressurs pga manglende id felter.");
                return;
            }

            if (!callback) {
                console.log("resources.js - ingen vits å hente ressurser, siden ingen er interessert i tilbakemeldingen...");
                return;
            }

            $.ajax({
                url: "/designer/" + org + "/" + service + "/" + edition + "/Text",
                type: 'GET',
                dataType: 'json',
                success: callback,
                error: function() { alert('Fant ikke tekstressurs'); },
                beforeSend: setHeader
            });
            

            function setHeader(xhr) {
                xhr.setRequestHeader('accept', 'application/json');
            }
        }
    };
});
