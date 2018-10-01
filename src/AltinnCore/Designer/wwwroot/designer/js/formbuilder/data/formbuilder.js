define([
       "jquery"
], function ($) {
    var that = this;
    return {
        initialize: function () {
            that = this;
        },
        saveView: function (org, service, edition, viewName, viewData) {
            $.ajax({
                type: "POST",
                url: "/designer/" + org + "/" + service + "/" + edition + "/UI/Save/" + viewName,
                data: {
                    html: viewData
                }
            });
        }
    };
});