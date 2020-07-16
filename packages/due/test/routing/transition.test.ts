import 'jest';
import { RouteBuilder } from '../../src/routing/route-builder';
import { TransitionController, TransitionStatus } from '../../src/routing/transition';
import { RootRouteDeclaration, RootPage, Routable, Route, DefaultRouteRegistry, ServiceCollection, DiagnosticsServiceTag, DefaultDiagnosticsService, RouteRegistry, LayoutRouteDeclaration, PageRouteDeclaration, ServiceProvider, Inherit } from '../../src';

class MockRoutable extends Routable {
}

async function setup(): Promise<[ServiceProvider, RouteRegistry]> {
	const rootRoute: RootRouteDeclaration = new RootRouteDeclaration(
		() => RootPage,
		(parent) => new RouteBuilder()
			// sign-in page
			.page('sign-in', '/sign-in', () => MockRoutable)
			// public facing page with all products from all tenants
			.layout('products', '/products', () => MockRoutable, builder => builder
				.page('list', '/', () => MockRoutable)
				.page('detail', '/:productId', () => MockRoutable)
			)
			// product management per tenant (alternative syntaxe)
			.layout({ name: 'portal', path: '/portal/:tenantId', defaults: { 'tenantId': Inherit }, page: () => MockRoutable }, builder => builder
				.layout({ name: 'products', path: '/products', page: () => MockRoutable }, builder => builder
					.page({ name: 'list', path: '/', page: () => MockRoutable })
					.page({ name: 'detail', path: '/:productId', page: () => MockRoutable })
				)
			)
			.build(parent)
	);

	const serviceCollection = new ServiceCollection();
	serviceCollection.bind(DiagnosticsServiceTag).toClass(DefaultDiagnosticsService).inSingletonLifetime();

	const serviceProvider = serviceCollection.build();

	const registry = serviceProvider.createFromClass(DefaultRouteRegistry);
	await registry.start(rootRoute);

	return [serviceProvider, registry];
}

test('parents are set properly', async () => {
	const [serviceProvider, registry] = await setup();

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
	const [serviceProvider, registry] = await setup();

	const signInTransition = serviceProvider.createFromClass(TransitionController, '0', null, registry.getByName('sign-in'), new Map(), new Map());
	await signInTransition.execute();
	expect(signInTransition.status).toBe(TransitionStatus.executed);
	expect(signInTransition.exiting.map(s => s.route.id)).toEqual([]);
	expect(signInTransition.retained.map(s => s.route.id)).toEqual([]);
	expect(signInTransition.entering.map(s => s.route.id)).toEqual([
		'$<root>',
		'$<root>.sign-in',
	]);

	const productDetail1Transition = serviceProvider.createFromClass(TransitionController, '1', signInTransition, registry.getByName('portal.products.detail'), new Map([['tenantId', '1'], ['productId', '1']]), new Map());
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
	const productDetail2Transition = serviceProvider.createFromClass(TransitionController, '2', productDetail1Transition, registry.getByName('portal.products.detail'), new Map([['tenantId', '1'], ['productId', '2']]), new Map());
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
	const productDetail3Transition = serviceProvider.createFromClass(TransitionController, '3', productDetail2Transition, registry.getByName('portal.products.detail'), new Map([['tenantId', '2'], ['productId', '2']]), new Map());
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
