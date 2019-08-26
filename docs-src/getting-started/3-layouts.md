# Layouts

Layout, same as page is represented by a class extending `ReactPage`. Difference between them is that layout is expected to render `<View />` component which specified where child page will be mounted. 

### Routing

Within routing layouts are registered using `RouteBuilder.layout` method and are expected to have children. Layout cannot be navigated to directly.

### Example

In this example you can see how you can use layouts to compose views and avoid duplicated code.

<iframe src="https://codesandbox.io/embed/3-layouts-83qbm?fontsize=12&codemirror=1&module=/src/pages/layout.tsx,/src/pages/home.tsx,/src/pages/contact.tsx,/src/index.tsx&view=split" title="stackino-due-hello-world" allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb" sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"></iframe>