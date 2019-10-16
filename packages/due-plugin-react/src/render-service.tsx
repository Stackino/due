import { ContainerTag, Container, inject, injectable, RenderService, Portal, RenderServiceTag, RootPage, Tag, Transition, getUid } from '@stackino/due';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { ReactPage } from './react-page';
import { ReactPortal } from './react-portal';
import { RenderContextContext, PageContext, PortalContext } from './context';
import { usePageContext } from './hooks';
import { createObservedTemplate } from './internal/tools';

function createPageElement(pageContext: PageContext): React.ReactElement<any> {
	const currentState = pageContext.transition.active[pageContext.index];

	// hack: adfkja
	const page = currentState.page as unknown as ReactPage;

	// hack: convert `Routable` to `ReactPage`
	if (!page.template) {
		page.template = () => <View />;
	}

	const Component = page.template;

	if (!Component.displayName) {
		Component.displayName = `${currentState.route.id}`;
	}

	const ObservedComponent = createObservedTemplate('ReactPage', Component);

	return <RenderContextContext.Provider value={pageContext}>
		<ObservedComponent />
	</RenderContextContext.Provider>;
}

function createPortalElements(container: Container, roots: Map<Portal<unknown, unknown>, HTMLDivElement>, portals: readonly Portal<unknown, unknown>[]): React.ReactPortal[] {
	for (const portal of roots.keys()) {
		if (portals.indexOf(portal) !== -1) {
			continue;
		}

		const el = roots.get(portal);
		if (el && el.parentElement) {
			// `el.remove()` is not supported in IE
			el.parentElement.removeChild(el);
		}
		roots.delete(portal);
	}

	const result: React.ReactPortal[] = [];

	for (const portal of portals) {
		let el = roots.get(portal);
		if (!el) {
			el = document.createElement('div');
			el.id = `stackino-due-portal-${getUid()}`;
			document.body.appendChild(el);
			roots.set(portal, el);
		}

		// hack: asdfsd
		const Component = (portal as unknown as ReactPortal<unknown, unknown>).template;

		if (!Component) {
			throw new Error('Portal doesn\'t have template');
		}
		
		if (!Component.displayName) {
			Component.displayName = `${portal.constructor.name}`;
		}

		const ObservedComponent = createObservedTemplate('ReactPortal', Component);

		// todo: this should be cached probably
		const nextPortalContext: PortalContext = {
			kind: 'portal',
			container: container,
		};

		result.push(ReactDOM.createPortal(<RenderContextContext.Provider value={nextPortalContext}>
			<ObservedComponent />
		</RenderContextContext.Provider>, el, el.id));
	}

	return result;
}

export interface ViewProps {
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
View.displayName = 'View';

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
		const portalElements = createPortalElements(this.container, this.portalRoots, portals);

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
