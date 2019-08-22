import 'jest';
import 'reflect-metadata';
import { RouteBuilder } from '../../src/routing/route-builder';
import { TransitionController, TransitionStatus } from '../../src/routing/transition';
import { RootRouteDeclaration, RootPage, Routable, Route, DefaultRouteRegistry, DefaultContainer, DiagnosticsServiceTag, DefaultDiagnosticsService, BindingScope, ContainerTag, RouteRegistry, Container, LayoutRouteDeclaration, PageRouteDeclaration } from '../../src';

class MockRoutable extends Routable {
}

async function setup(): Promise<[Container, RouteRegistry]> {
    const rootRoute: RootRouteDeclaration = new RootRouteDeclaration(
        () => RootPage,
        (parent) => new RouteBuilder()
            // sign-in page
            .page('sign-in', '/sign-in', () => MockRoutable)
            // public facing page with all products from all tenants
            .layout('products', '/products', () => MockRoutable, productsBuilder => productsBuilder
                .page('list', '/', () => MockRoutable)
                .page('detail', '/:productId', () => MockRoutable)
            )
            // product management per tenant
            .layout('portal', '/portal/:tenantId', () => MockRoutable, portalBuilder => portalBuilder
                .layout('products', '/products', () => MockRoutable, productsBuilder => productsBuilder
                    .page('list', '/', () => MockRoutable)
                    .page('detail', '/:productId', () => MockRoutable)
                )
            )
            .build(parent)
    );

    const container = new DefaultContainer();
    container.bindConstantValue(ContainerTag, container);
    container.bind(DiagnosticsServiceTag, DefaultDiagnosticsService, BindingScope.singleton);

    const registry = new DefaultRouteRegistry();
    container.inject(registry);
    await registry.start(rootRoute);

    return [container, registry];
}

test('parents are set properly', async () => {
    const [container, registry] = await setup();

    function verifyParents(route: Route) {
        for (const child of route.children) {
            expect(child.parent).toBe(route);

            if (child.declaration instanceof LayoutRouteDeclaration || child.declaration instanceof PageRouteDeclaration) {
                expect(child.declaration.parent).toBe(route.declaration);
            }

            verifyParents(child);
        }
    }

    verifyParents(registry.root);
});

test('transition intersection', async () => {
    const [container, registry] = await setup();

    const signInTransition = new TransitionController('0', null, registry.getByName('sign-in'), new Map());
    container.inject(signInTransition);
    await signInTransition.execute();
    expect(signInTransition.status).toBe(TransitionStatus.executed);
    expect(signInTransition.exiting.map(s => s.route.id)).toEqual([]);
    expect(signInTransition.retained.map(s => s.route.id)).toEqual([]);
    expect(signInTransition.entering.map(s => s.route.id)).toEqual([
        '$<root>',
        '$<root>.sign-in',
    ]);

    const productDetail1Transition = new TransitionController('1', signInTransition, registry.getByName('portal.products.detail'), new Map([['tenantId', '1'], ['productId', '1']]));
    container.inject(productDetail1Transition);
    await productDetail1Transition.execute();
    expect(productDetail1Transition.status).toBe(TransitionStatus.executed);
    expect(productDetail1Transition.exiting.map(s => s.route.id)).toEqual([
        '$<root>.sign-in',
    ]);
    expect(productDetail1Transition.retained.map(s => s.route.id)).toEqual([
        '$<root>',
    ]);
    expect(productDetail1Transition.entering.map(s => s.route.id)).toEqual([
        '$<root>.portal',
        '$<root>.portal.products',
        '$<root>.portal.products.detail',
    ]);
    
    // transitioning using only parameter should trigger exit/enter of self
    const productDetail2Transition = new TransitionController('2', productDetail1Transition, registry.getByName('portal.products.detail'), new Map([['tenantId', '1'], ['productId', '2']]));
    container.inject(productDetail2Transition);
    await productDetail2Transition.execute();
    expect(productDetail2Transition.status).toBe(TransitionStatus.executed);
    expect(productDetail2Transition.exiting.map(s => s.route.id)).toEqual([
        '$<root>.portal.products.detail',
    ]);
    expect(productDetail2Transition.retained.map(s => s.route.id)).toEqual([
        '$<root>',
        '$<root>.portal',
        '$<root>.portal.products',
    ]);
    expect(productDetail2Transition.entering.map(s => s.route.id)).toEqual([
        '$<root>.portal.products.detail',
    ]);
    
    // transitioning using only parameter should trigger exit/enter of self and all child nodes
    const productDetail3Transition = new TransitionController('3', productDetail2Transition, registry.getByName('portal.products.detail'), new Map([['tenantId', '2'], ['productId', '2']]));
    container.inject(productDetail3Transition);
    await productDetail3Transition.execute();
    expect(productDetail3Transition.status).toBe(TransitionStatus.executed);
    expect(productDetail3Transition.exiting.map(s => s.route.id)).toEqual([
        '$<root>.portal.products.detail',
        '$<root>.portal.products',
        '$<root>.portal',
    ]);
    expect(productDetail3Transition.retained.map(s => s.route.id)).toEqual([
        '$<root>',
    ]);
    expect(productDetail3Transition.entering.map(s => s.route.id)).toEqual([
        '$<root>.portal',
        '$<root>.portal.products',
        '$<root>.portal.products.detail',
    ]);
});
