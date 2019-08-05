import { ContainerTag, Container, inject, injectable, RenderService, Portal, RenderServiceTag, RootPage, Tag, Transition, Routable } from '@stackino/due';
import * as React from 'react';
import { useContext } from 'react';
import * as ReactDOM from 'react-dom';
import { observer } from 'mobx-react-lite';

const ObservedComponentKey = Symbol('Stackino due react observed component');

export interface ReactPage extends Routable {
	component: React.FunctionComponent;
};

export abstract class ReactPortal<TInput, TOutput> extends Portal<TInput, TOutput> {
	abstract template: React.FunctionComponent;
}

export type RenderContext = PageContext | PortalContext;

export interface PageContext {
	readonly kind: 'page';
	readonly container: Container;
	readonly transition: Transition;
	readonly index: number;
}

export interface PortalContext {
	readonly kind: 'portal';
	readonly container: Container;
}

export const RenderContextContext = React.createContext<RenderContext | null>(null);

export function useRenderContext(): RenderContext {
	const context = useContext(RenderContextContext);

	if (!context) {
		throw new Error('RenderContext requested outside of render pipeline');
	}

	return context;
}

export function usePageContext(): PageContext {
	const context = useRenderContext();

	if (context.kind !== 'page') {
		throw new Error('PageContext requested outside of render pipeline');
	}

	return context;
}

export function usePortalContext(): PortalContext {
	const context = useRenderContext();

	if (context.kind !== 'portal') {
		throw new Error('PortalContext requested outside of render pipeline');
	}

	return context;
}

export function useDependency<T>(tag: Tag<T>): T {
	const context = useRenderContext();

	return context.container.get(tag);
}

function createPageElement(pageContext: PageContext): React.ReactElement<any> {
	const currentState = pageContext.transition.active[pageContext.index];

	// todo: sanity checks and warnings for accessing `page` and `component`

	const Component = (currentState.page as ReactPage).component;
	if (!Component.displayName) {
		Component.displayName = `Component(${currentState.route.id})`;
	}

	if (!Component.hasOwnProperty(ObservedComponentKey)) {
		Object.defineProperty(Component, ObservedComponentKey, {
			value: observer(Component),
			enumerable: false,
		});
	}

	const ObservedComponent = (Component as any)[ObservedComponentKey];

	return <RenderContextContext.Provider value={pageContext}>
		<ObservedComponent />
	</RenderContextContext.Provider>;
}

interface ViewProps {
	pageContext?: PageContext;
}

export const View: React.FunctionComponent<ViewProps> = (props): React.ReactElement | null => {
	const pageContext = props.pageContext || usePageContext();

	if (!pageContext) {
		return null;
	}

	const nextPageContext: PageContext = {
		kind: 'page',
		container: pageContext.container,
		transition: pageContext.transition,
		index: pageContext.index + 1,
	};

	return createPageElement(nextPageContext);
}

export const ReactRenderServiceOptionsTag = new Tag<ReactRenderServiceOptions>('Stackino react render service options');

export interface ReactRenderServiceOptions {
	output: HTMLElement | ((html: string) => void);
}

@injectable(RenderServiceTag)
export class ReactRenderService implements RenderService {
	@inject(ContainerTag)
	private container!: Container;

	@inject(ReactRenderServiceOptionsTag)
	private options!: ReactRenderServiceOptions;

	private portalRoots: Map<Portal<unknown, unknown>, HTMLDivElement> = new Map();

	private domServer: typeof import('react-dom/server') | null = null;

	private rootPageContext: PageContext | null = null;

	private createPortals(portals: readonly Portal<unknown, unknown>[]): React.ReactPortal[] {
		for (const portal of this.portalRoots.keys()) {
			if (portals.indexOf(portal) !== -1) {
				continue;
			}

			const el = this.portalRoots.get(portal);
			if (el && el.parentElement) {
				// `el.remove()` is not supported in IE
				el.parentElement.removeChild(el);
			}
			this.portalRoots.delete(portal);
		}

		const result: React.ReactPortal[] = [];

		for (const portal of portals) {
			let el = this.portalRoots.get(portal);
			if (!el) {
				el = document.createElement('div');
				document.body.appendChild(el);
				this.portalRoots.set(portal, el);
			}

			const Component = (portal as ReactPortal<unknown, unknown>).template;
			const ObservedComponent = observer(Component);

			const nextPortalContext: PortalContext = {
				kind: 'portal',
				container: this.container,
			};

			// todo: better keys
			result.push(ReactDOM.createPortal(<RenderContextContext.Provider value={nextPortalContext}>
				<ObservedComponent />
			</RenderContextContext.Provider>, el, `portal-${portals.indexOf(portal)}`));
		}

		return result;
	}

	async start(): Promise<void> {
		if (typeof this.options.output === 'function') {
			this.domServer = await import('react-dom/server');
		}

		return Promise.resolve();
	}

	render(transition: Transition | null, portals: readonly Portal<unknown, unknown>[]): void {
		if (!transition) {
			return;
		}

		const root = transition.active[0];

		if (!(root.page instanceof RootPage)) {
			throw new Error('Attempt to render invalid root state');
		}
		if (transition.active.length <= 1) {
			throw new Error('No active state');
		}

		let rootPageContext: PageContext;

		if (this.rootPageContext && this.rootPageContext.transition === transition) {
			rootPageContext = this.rootPageContext;
		} else {
			rootPageContext = this.rootPageContext = {
				kind: 'page',
				container: this.container,
				transition,
				index: 1,
			};
		}

		const rootViewElement = createPageElement(rootPageContext);
		const portalElements = this.createPortals(portals);

		const appElement = <>
			{rootViewElement}
			{portalElements}
		</>;

		if (typeof this.options.output === 'function') {
			const html = this.domServer!.renderToString(appElement);

			this.options.output(html);
		} else {
			ReactDOM.render(appElement, this.options.output);
		}
	}

	stop(): Promise<void> {
		return Promise.resolve();
	}
}
