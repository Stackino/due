import { Provider, Newable, executeProvider } from '../tools';
import { Routable } from './routable';
import { RouteDeclaration, LayoutRouteDeclaration, PageRouteDeclaration } from './route-declaration';

export type BuildRouteDelegate = (builder: RouteBuilder) => void;

export class RouteBuilder {
	readonly actions: ((parent: RouteDeclaration) => RouteDeclaration)[] = [];

	layout(name: string | null, url: string | null, page: Provider<Newable<Routable>>, children: Provider<BuildRouteDelegate>): RouteBuilder {
		this.actions.push(parent => new LayoutRouteDeclaration(name, url, page, parent, async () => {
			const childrenBuilder = new RouteBuilder();
			(await executeProvider(children))(childrenBuilder);

			return childrenBuilder.build(parent);
		}));

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
