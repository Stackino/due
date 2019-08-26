# Pages

Page is basic building block of our web application. It is combination of visual, state and page specific logic. Page is created by extending class `ReactPage`.

### Routing

To be able to navigate to a page it must have at least one registered route. Route to a page can be created by `RouteBuilder.page` method within `MyApplication.configureRoutes`. Page route is directly navigable and cannot have children.

### Example

This example shows how to have multiple pages within our application and navigate between them.

<iframe src="https://codesandbox.io/embed/2-pages-oheux?fontsize=12&codemirror=1&module=/src/index.tsx,/src/pages/home.tsx,/src/pages/contact.tsx,/src/components/menu.tsx&view=split" title="stackino-due-hello-world" allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb" sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"></iframe>