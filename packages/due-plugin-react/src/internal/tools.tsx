import { observer } from 'mobx-react-lite';

const ObservedComponentKey = Symbol('Stackino due react observed component');

export function createObservedTemplate(name: string, template: React.FunctionComponent) {
	if (!template.displayName) {
		template.displayName = template.displayName || template.name || 'Anonymous template';
	}

	if (!template.hasOwnProperty(ObservedComponentKey)) {
		const observedComponent = observer(template);

		Object.defineProperty(template, ObservedComponentKey, {
			value: observedComponent,
			enumerable: false,
		});

		observedComponent.displayName = `${name}(${observedComponent.displayName})`;
	}

	return (template as any)[ObservedComponentKey];
}