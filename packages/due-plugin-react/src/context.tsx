import * as React from 'react';
import { Container, Transition } from '@stackino/due';

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
RenderContextContext.displayName = 'RenderContext';
