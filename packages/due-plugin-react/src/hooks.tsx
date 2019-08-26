import * as React from 'react';
import { Tag } from '@stackino/due';
import { PortalContext, PageContext, RenderContext, RenderContextContext } from './context';

export function useRenderContext(): RenderContext {
	const context = React.useContext(RenderContextContext);

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
