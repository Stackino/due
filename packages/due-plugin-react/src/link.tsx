import { RouterTag } from '@stackino/due-core';
import * as classNames from 'classnames';
import * as React from 'react';
import { useDependency } from './render-service';
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
	to: string;
	params?: ReadonlyMap<string, string> | { [key: string]: unknown };
	activeName?: string;
	activeParams?: ReadonlyMap<string, string> | { [key: string]: unknown };

	id?: string;
	style?: React.CSSProperties;
	className?: string;
	activeClassName?: string;
}

export const Link: React.FunctionComponent<LinkProps> = observer(({ to, params, activeName, activeParams, id, style, className, activeClassName, children }) => {
	const router = useDependency(RouterTag);
	const handleClick = React.useCallback((event: React.MouseEvent) => {
		event.preventDefault();
		event.stopPropagation();

		router.goToName(to, normalizeParams(params));
	}, [router, to, params]);

	return <a
		href={router.pathForName(to, normalizeParams(params))} onClick={handleClick}
		id={id} className={classNames(className, router.isActiveName(activeName || to, normalizeParams(activeParams || params)) && activeClassName)} style={style}
	>{children}</a>;
});
Link.defaultProps = {
	activeClassName: 'active',
};
