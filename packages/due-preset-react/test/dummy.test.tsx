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
        url: "/",
        page: () => TestPage,
    }, builder => builder);
    builder.layout('home', '/', () => TestPage, builder => builder);

    builder.layout({
        name: "home",
        url: "/",
    }, builder => builder);
    builder.layout('home', '/', null, builder => builder);

    builder.page({
        name: "home",
        url: "/",
        page: () => TestPage
    });
    builder.page('home', '/', () => TestPage);
}

test('dummy', async () => {
    expect(true).toBeTruthy();
});

