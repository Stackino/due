import { Provider, Newable, executeProvider } from '../tools';
import { Routable } from './routable';
import { RouteDeclaration, LayoutRouteDeclaration, PageRouteDeclaration } from './route-declaration';

export type BuildRouteDelegate = (builder: RouteBuilder) => void;

// interface RoutedPage {
// 	name: string;
// 	url: string;
// 	page: Provider<Newable<Routable>>;
// }

// interface RoutedLayout {
// 	name?: string | null;
// 	url?: string | null;
// 	page?: Provider<Newable<Routable>>;
// 	children: Routed[];
// }

// function isRoutedLayout(routed: Routed): routed is RoutedLayout {
// 	return !!(routed as any).children;
// }

// type Routed = RoutedPage | RoutedLayout;

export class RouteBuilder {
	readonly actions: ((parent: RouteDeclaration) => RouteDeclaration)[] = [];

	layout(name: string | null, url: string | null, page: Provider<Newable<Routable>>, children: BuildRouteDelegate): RouteBuilder {
		this.actions.push(parent => {
			const childrenBuilder = new RouteBuilder();
			children(childrenBuilder);
			return new LayoutRouteDeclaration(name, url, page, parent, (parent) => childrenBuilder.build(parent));
		});

		return this;
	}

	page(name: string, url: string, page: Provider<Newable<Routable>>): RouteBuilder {
		this.actions.push(parent => new PageRouteDeclaration(name, url, page, parent));

		return this;
	}

	build(parent: RouteDeclaration): RouteDeclaration[] {
		return this.actions.map(action => action(parent));
	}
}
