import * as React from 'react';
import { ServiceProvider, Transition } from '@stackino/due';

export type RenderContext = PageContext | PortalContext;

export interface PageContext {
	readonly kind: 'page';
	readonly serviceProvider: ServiceProvider;
	readonly transition: Transition;
	readonly index: number;
}

export interface PortalContext {
	readonly kind: 'portal';
	readonly serviceProvider: ServiceProvider;
}

export const RenderContextContext = React.createContext<RenderContext | null>(null);
RenderContextContext.displayName = 'RenderContext';
