import { Router, RouterTag } from '@stackino/due';
import * as classNames from 'classnames';
import { autobind } from 'core-decorators';
import * as React from 'react';
import { ViewContextContext } from './render-service';

function normalizeParams(params?: ReadonlyMap<string, string> | { [key: string]: string } | undefined): Map<string, string> | undefined {
	if (!params) {
		return undefined;
	} else if (params instanceof Map) {
		// todo: is there need to check for map-like objects?
		return params;
	} else if (typeof params === 'object' && params !== null) {
		const paramsMap = new Map<string, string>();

		for (const pair of Object.entries(params)) {
			if (!pair[1]) {
				continue;
			}

			paramsMap.set(pair[0], pair[1].toString());
		}

		return paramsMap;
	} else {
		// todo: maybe throw instead? log?
		return undefined;
	}
}

export interface LinkProps {
	to: string;
	params?: ReadonlyMap<string, string> | { [key: string]: string };
	activeName?: string;

	id?: string;
	style?: React.CSSProperties;
	className?: string;
	activeClassName: string;
}

export class Link extends React.Component<LinkProps> {

	static defaultProps = {
		activeClassName: 'active',
	};

	@autobind
	private handleClick(event: React.MouseEvent, router: Router): void {
		event.preventDefault();
		event.stopPropagation();

		router.goToName(this.props.to, normalizeParams(this.props.params));
	}

	render() {
		const {
			to, params, activeName,
			id, style, className, activeClassName,
			children,
		} = this.props;

		return (
			<ViewContextContext.Consumer>{(viewContext) => {
				const routerService = viewContext!.container.get(RouterTag);

				return <a
					href={routerService.pathForName(to, normalizeParams(params))} onClick={(event) => this.handleClick(event, routerService)}
					id={id} className={classNames(className, routerService.isActiveName(activeName || to) && activeClassName)} style={style}
				>{children}</a>;
			}}</ViewContextContext.Consumer>
		);
	}
}
