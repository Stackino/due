import { ContainerTag, Container, inject, injectable, RenderService, Portalable, RenderServiceTag, RootPage, Tag, Transition, Routable } from '@stackino/due';
import * as React from 'react';
import { useContext } from 'react';
import * as ReactDOM from 'react-dom';
import { observer } from 'mobx-react-lite';

export interface ReactPage extends Routable {
	component: React.FunctionComponent;
};

export interface ReactPortal<TInput, TOutput> extends Portalable<TInput, TOutput> {
	component: React.FunctionComponent;
}

export interface ViewContext {
	readonly container: Container;
	readonly transition: Transition;
	readonly index: number;
}

export const ViewContextContext = React.createContext<ViewContext | null>(null);

export function useViewContext(): ViewContext {
	const context = useContext(ViewContextContext);

	if (!context) {
		throw new Error('ViewContext requested outside of render pipeline');
	}

	return context;
}

export function useDependency<T>(tag: Tag<T>): T {
	const context = useViewContext();

	return context.container.get(tag);
}

function createViewElement(viewContext: ViewContext): React.ReactElement<any> {
	const currentState = viewContext.transition.active[viewContext.index];

	// todo: sanity checks and warnings for accessing `page` and `component`

	const Component = (currentState.page as ReactPage).component;
	if (!Component.displayName) {
		Component.displayName = `Component(${currentState.route.id})`;
	}

	const nextViewContext: ViewContext = {
		container: viewContext.container,
		transition: viewContext.transition,
		index: viewContext.index + 1,
	};

	const ObservedComponent = observer(Component);

	return <ViewContextContext.Provider value={nextViewContext}>
		<ObservedComponent />
	</ViewContextContext.Provider>;
}

interface ViewProps {
	viewContext?: ViewContext;
}

export const View: React.FunctionComponent<ViewProps> = (props): React.ReactElement | null => {
	const viewContext = props.viewContext || useViewContext();

	if (!viewContext) {
		return null;
	}

	return createViewElement(viewContext);
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

	private portalRoots: Map<Portalable<unknown, unknown>, HTMLDivElement> = new Map();

	private domServer: typeof import('react-dom/server') | null = null;

	private createPortals(portalables: ReadonlyArray<Portalable<unknown, unknown>>): React.ReactPortal[] {
		for (const portalable of this.portalRoots.keys()) {
			if (portalables.indexOf(portalable) !== -1) {
				continue;
			}

			const el = this.portalRoots.get(portalable);
			if (el && el.parentElement) {
				// `el.remove()` is not supported in IE
				el.parentElement.removeChild(el);
			}
			this.portalRoots.delete(portalable);
		}

		const result: React.ReactPortal[] = [];

		for (const portalable of portalables) {
			let el = this.portalRoots.get(portalable);
			if (!el) {
				el = document.createElement('div');
				document.body.appendChild(el);
				this.portalRoots.set(portalable, el);
			}

			const Component = (portalable as ReactPortal<unknown, unknown>).component;
			const ObservedComponent = observer(Component);

			result.push(ReactDOM.createPortal(<ObservedComponent />, el));
		}

		return result;
	}

	async start(): Promise<void> {
		if (typeof this.options.output === 'function') {
			this.domServer = await import('react-dom/server');
		}

		return Promise.resolve();
	}

	render(transition: Transition | null, portals: ReadonlyArray<Portalable<unknown, unknown>>): void {
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

		const rootViewContext: ViewContext = {
			container: this.container,
			transition,
			index: 1,
		};

		const rootViewElement = createViewElement(rootViewContext);
		const portalElements = this.createPortals(portals);

		const appElement = <>{rootViewElement}{portalElements}</>;

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
