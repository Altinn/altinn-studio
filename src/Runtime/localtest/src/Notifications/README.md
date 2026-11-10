# Notifications

Localtest's Notifications emulation copies code from
[altinn-notifications](https://github.com/Altinn/altinn-notifications). When you copy more of it:

- Copy core code as it is.
- Copy controllers, and adapt their authorization, since local requests carry no platform access token.
- Do not copy persistence. Write a repository that stores the data on disk instead.
- Register new services in `Startup.cs`.

The order chain API (`future/orders`) and the shipment status (`future/shipment/{id}`) are the exception: a small
stand-in in `LocalTestNotifications/LocalFutureOrdersController.cs` records orders and reports each shipment as
delivered, or with the outcome a marker in the order's text picks. Like Notifications, it first asks the app's send
condition, and reports a shipment the app says no to as not sent. Replace it if the real order chain code is copied
in.
