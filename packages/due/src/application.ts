import { BindingScope, Container, ContainerTag, DefaultContainer } from './ioc';
import { DefaultDiagnosticsService, DiagnosticsServiceTag } from './diagnostics';
import { RouterTag, RouteBuilder, RootRouteDeclaration, RouteRegistryTag, DefaultRouteRegistry, DefaultRouter, Routable } from './routing';
import { RenderServiceTag, ViewServiceTag, DefaultViewService, RootPage } from './rendering';
import { Plugin } from './plugin';

export abstract class Application {
	protected configurePlugins?(): Plugin[] | Promise<Plugin[]>;
	protected configureServices?(services: Container): void | Promise<void>;
	protected configureRoutes?(builder: RouteBuilder): void | Promise<void>;
	protected onStarting?(services: Container): void | Promise<void>;
	protected onStopping?(services: Container): void | Promise<void>;

	private async runAsync(): Promise<void> {
		const services = new DefaultContainer();
		services.bindConstantValue(ContainerTag, services);

		// configure plugins
		const plugins = this.configurePlugins ? await this.configurePlugins() : [];
		for (const plugin of plugins) {
			if (plugin.configureServices) {
				await plugin.configureServices(services);
			}
		}

		// configure services
		if (this.configureServices) {
			await this.configureServices(services);
		}
		services.tryBind(DiagnosticsServiceTag, DefaultDiagnosticsService, BindingScope.singleton);
		services.tryBind(RouteRegistryTag, DefaultRouteRegistry, BindingScope.singleton);
		services.tryBind(ViewServiceTag, DefaultViewService, BindingScope.singleton);
		services.tryBind(RouterTag, DefaultRouter, BindingScope.singleton);

		// configure routes
		const builder = new RouteBuilder();
		if (this.configureRoutes) {
			await this.configureRoutes(builder);
		}
		const rootRoute: RootRouteDeclaration = new RootRouteDeclaration(
			() => RootPage,
			(parent) => builder.build(parent)
		);

		// start core services
		await services.get(DiagnosticsServiceTag).start();
		await services.get(RouteRegistryTag).start(rootRoute);
		await services.get(RouterTag).start();
		await services.get(RenderServiceTag).start();
		await services.get(ViewServiceTag).start();

		// start plugins
		for (const plugin of plugins) {
			if (!plugin.onStarting) {
				continue;
			}

			await plugin.onStarting(services);
		}

		// start application
		if (this.onStarting) {
			await this.onStarting(services);
		}

		// wait for exit?
		//  - browser - new api to stop running app? `run` returning stop function?
		//  - ssr - after router is idle?

		// stop application?
	}

	public run(errorHandler?: (error: unknown) => void): void {
		errorHandler = errorHandler || (reason => console.error('fatal error', reason));

		this.runAsync()
			.catch(errorHandler);
	}
}
