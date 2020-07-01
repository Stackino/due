import 'jest';
import 'reflect-metadata';
import { ReactPage, RouteBuilder } from '../src';

class TestPage extends ReactPage {
	template = () => {
		return null;
	}
}

function configureRoutes(builder: RouteBuilder) {
	builder.layout({
		name: "home",
		path: "/",
		page: () => TestPage,
	}, builder => builder);
	builder.layout('home', '/', () => TestPage, builder => builder);

	builder.layout({
		name: "home",
		path: "/",
	}, builder => builder);
	builder.layout('home', '/', null, builder => builder);

	builder.page({
		name: "home",
		path: "/",
		page: () => TestPage
	});
	builder.page('home', '/', () => TestPage);
}

test('dummy', async () => {
	expect(true).toBeTruthy();
});

