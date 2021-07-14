import * as React from 'react';
import { makeObservable, observable, runInAction } from 'mobx';
import { useDependency } from './hooks';
import { Composable, ServiceProviderTag } from '@stackino/due';
import { createObservedTemplate } from './internal/tools';

// eslint-disable-next-line @typescript-eslint/ban-types
export abstract class ReactComponent<TProps = {}> extends Composable {
	constructor(props: TProps) {
		super();

		this.props = props;

		makeObservable(this, {
			props: observable.ref
		});
	}

	props: TProps;

	onUpdate?(nextProps: TProps, prevProps: TProps): void;

	abstract template: React.FunctionComponent;
}

export function connectReactComponent<TReactComponent extends ReactComponent<TProps>, TProps>(reactComponent: new (props: TProps) => TReactComponent): React.FunctionComponent<TProps> {
	let underlyingName = reactComponent.name || 'Anonymous template';
	if (underlyingName.endsWith('Component')) {
		underlyingName = underlyingName.substr(0, underlyingName.length - 9);
	}

	const connector: React.FunctionComponent<TProps> = (props: TProps) => {
		const serviceProvider = useDependency(ServiceProviderTag);
		const instanceRef = React.useRef<TReactComponent | null>(null);

		let instance = instanceRef.current;

		if (!instance) {
			instance = serviceProvider.createFromClass(reactComponent, props);

			if (!instance.template.displayName) {
				instance.template.displayName = underlyingName;
			}

			instanceRef.current = instance;
		}

		const ObservedComponent = createObservedTemplate('ReactComponent', instance.template);

		React.useEffect(() => {
			runInAction(() => {
				if (instance!.onUpdate) {
					instance!.onUpdate(props, instance!.props);
				}
				instance!.props = props;
			});
		}, [props]);

		return <ObservedComponent />;
	};

	if (!connector.displayName && reactComponent.name) {
		connector.displayName = `ReactComponentConnector(${underlyingName})`;
	}

	return connector;
}