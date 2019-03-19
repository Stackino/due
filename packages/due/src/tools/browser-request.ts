export class BrowserRequest {
	constructor(action: string, method: 'GET' | 'POST' = 'POST') {
		this.action = action;
		this.method = method;
		this.parameters = new Map();
	}

	public action: string;
	public method: 'GET' | 'POST';
	public parameters: Map<string, string>;

	send(): void {
		var form = document.createElement('form');
		form.setAttribute('method', this.method);
		form.setAttribute('action', this.action);

		this.parameters.forEach((value, key) => {
			var field = document.createElement('input');
			field.setAttribute('type', 'hidden');
			field.setAttribute('name', key);
			field.setAttribute('value', value);
			form.appendChild(field);
		});

		document.body.appendChild(form);
		form.submit();
	}
}
