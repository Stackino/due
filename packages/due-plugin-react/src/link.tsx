import { RouteParams, RouteData, RouterTag } from '@stackino/due';
import classNames from 'classnames';
import * as React from 'react';
import { useDependency, usePageContext, useRenderContext } from './hooks';
import { observer } from 'mobx-react-lite';
import { render } from 'react-dom';

export interface LinkProps {
	variant?: 'a' | 'li + a';

	to: string;
	params?: RouteParams;
	data?: RouteData;
	activeName?: string;
	activeParams?: RouteParams;

	id?: string;
	style?: React.CSSProperties;
	className?: string;
	activeClassName?: string;
}

export const Link: React.FunctionComponent<LinkProps> = observer(function ({ variant = 'a', to, params, data, activeName, activeParams, id, style, className, activeClassName = 'active', children }) {
	const renderContext = useRenderContext();
	const router = useDependency(RouterTag);
	const handleClick = React.useCallback((event: React.MouseEvent) => {
		event.preventDefault();
		event.stopPropagation();

		router.goToName(to, params, data);
	}, [router, to, params]);

	const transition = renderContext.kind === 'page' ? renderContext.transition : router.activeTransition;

	const href = router.pathForName(to, params, transition);
	const isActive = router.isActiveName(activeName ?? to, activeParams ?? params, transition);
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