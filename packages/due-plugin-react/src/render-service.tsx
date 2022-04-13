import { RenderService, Portal, RenderServiceTag, RootPage, Tag, Transition, getUid, ServiceProvider, Injectable, ServiceProviderTag } from '@stackino/due';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { ReactPage } from './react-page';
import { ReactPortal } from './react-portal';
import { RenderContextContext, PageContext, PortalContext } from './context';
import { usePageContext } from './hooks';
import { createObservedTemplate } from './internal/tools';

// eslint-disable-next-line prefer-const
export let View: React.FunctionComponent<ViewProps>;

function createPageElement(pageContext: PageContext): React.ReactElement<any> {
	const currentState = pageContext.transition.active[pageContext.index];

	// hack: adfkja
	const page = currentState.instance as unknown as ReactPage;

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

function createPortalElements(serviceProvider: ServiceProvider, roots: Map<Portal<unknown, unknown>, HTMLDivElement>, portals: readonly Portal<unknown, unknown>[]): React.ReactPortal[] {
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
			serviceProvider: serviceProvider,
		};

		const reactPortal: React.ReactPortal = ReactDOM.createPortal(<RenderContextContext.Provider value={nextPortalContext}>
			<ObservedComponent />
		</RenderContextContext.Provider>, el, el.id);

		result.push(reactPortal);
	}

	return result;
}

export interface ViewProps {
	pageContext?: PageContext;
	
	children?: (pageElement: React.ReactElement) => React.ReactElement;
}

View = (props): React.ReactElement | null => {
	const pageContext = props.pageContext || usePageContext();

	const nextIndex = pageContext.index + 1;
	if (!pageContext || pageContext.transition.active.length <= nextIndex) {
		return null;
	}

	const nextPageContext: PageContext = {
		kind: 'page',
		serviceProvider: pageContext.transition.active[nextIndex - 1].serviceProvider,
		transition: pageContext.transition,
		index: nextIndex,
	};

	const pageElement = createPageElement(nextPageContext);

	return props.children ? props.children(pageElement) : pageElement;
}
View.displayName = 'View';

export const ReactRenderServiceOptionsTag = new Tag<ReactRenderServiceOptions>('Stackino react render service options');

export interface ReactRenderServiceOptions {
	render: (app: React.ReactNode) => void;
}

export class ReactRenderService extends Injectable implements RenderService {

	private serviceProvider = this.$dependency(ServiceProviderTag);
	private options = this.$dependency(ReactRenderServiceOptionsTag);

	private portalRoots: Map<Portal<unknown, unknown>, HTMLDivElement> = new Map();

	private rootPageContext: PageContext | null = null;

	async start(): Promise<void> {
		return Promise.resolve();
	}

	render(transition: Transition | null, portals: readonly Portal<unknown, unknown>[]): void {
		if (!transition) {
			return;
		}

		const root = transition.active[0];

		if (!(root.instance instanceof RootPage)) {
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
				serviceProvider: transition.active[0].serviceProvider,
				transition,
				index: 1,
			};
		}

		const rootViewElement = createPageElement(rootPageContext);
		const portalElements = createPortalElements(this.serviceProvider, this.portalRoots, portals);

		const appElement = <>
			{rootViewElement}
			{portalElements}
		</>;

		this.options.render(appElement);
	}

	stop(): Promise<void> {
		return Promise.resolve();
	}
}
