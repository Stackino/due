import { RouterTag } from '@stackino/due';
import * as classNames from 'classnames';
import * as React from 'react';
import { useDependency } from './hooks';
import { observer } from 'mobx-react-lite';

function normalizeParams(params?: ReadonlyMap<string, string> | { [key: string]: unknown } | undefined): Map<string, string> | undefined {
	if (!params) {
		return undefined;
	} else if (params instanceof Map) {
		// todo: is there need to check for map-like objects?
		return params;
	} else if (typeof params === 'object' && params !== null) {
		const paramsMap = new Map<string, string>();

		for (const [key, value] of Object.entries(params)) {
			if (value === null || value === undefined) {
				continue;
			}

			paramsMap.set(key, (value as any).toString());
		}

		return paramsMap;
	} else {
		// todo: maybe throw instead? log?
		return undefined;
	}
}

export interface LinkProps {
	variant?: 'a' | 'li + a';

	to: string;
	params?: ReadonlyMap<string, string> | { [key: string]: unknown };
	activeName?: string;
	activeParams?: ReadonlyMap<string, string> | { [key: string]: unknown };

	id?: string;
	style?: React.CSSProperties;
	className?: string;
	activeClassName?: string;
}

export const Link: React.FunctionComponent<LinkProps> = observer(function ({ variant = 'a', to, params, activeName, activeParams, id, style, className, activeClassName = 'active', children }) {
	const router = useDependency(RouterTag);
	const handleClick = React.useCallback((event: React.MouseEvent) => {
		event.preventDefault();
		event.stopPropagation();

		router.goToName(to, normalizeParams(params));
	}, [router, to, params]);

	const href = router.pathForName(to, normalizeParams(params));
	const isActive = router.isActiveName(activeName || to, normalizeParams(activeParams || params));
	const computedClassName = classNames(className, isActive && activeClassName);

	if (variant === 'a') {
		return <a
			href={href} onClick={handleClick}
			id={id} className={computedClassName} style={style}
		>{children}</a>;
	} else if (variant === 'li + a') {
		return <li onClick={handleClick} className={computedClassName}>
			<a
				href={href} onClick={handleClick}
				id={id} style={style}
			>{children}</a>
		</li>;
	} else {
		throw new Error(`Invalid link variant '${variant}'`);
	}
});
Link.displayName = 'Link';