import { ServiceCollection, ServiceProvider, ServiceProviderTag } from './ioc';
import { DefaultDiagnosticsService, DiagnosticsServiceTag } from './diagnostics';
import { RouterTag, RouteBuilder, RootRouteDeclaration, RouteRegistryTag, DefaultRouteRegistry, DefaultRouter, Routable } from './routing';
import { RenderServiceTag, ViewServiceTag, DefaultViewService, RootPage } from './rendering';
import { Plugin } from './plugin';

export abstract class Application {
	protected configurePlugins?(): Plugin[] | Promise<Plugin[]>;
	protected configureServices?(services: ServiceCollection): void | Promise<void>;
	protected configureRoutes?(builder: RouteBuilder): void | Promise<void>;
	protected onStarting?(services: ServiceProvider): void | Promise<void>;
	protected onStopping?(services: ServiceProvider): void | Promise<void>;

	private async runAsync(): Promise<void> {
		const serviceCollection = new ServiceCollection();

		// configure plugins
		const plugins = this.configurePlugins ? await this.configurePlugins() : [];
		for (const plugin of plugins) {
			if (plugin.configureServices) {
				await plugin.configureServices(serviceCollection);
			}
		}

		// configure services
		if (this.configureServices) {
			await this.configureServices(serviceCollection);
		}
		serviceCollection.tryBind(DiagnosticsServiceTag).toClass(DefaultDiagnosticsService).inSingletonLifetime();
		serviceCollection.tryBind(RouteRegistryTag).toClass(DefaultRouteRegistry).inSingletonLifetime();
		serviceCollection.tryBind(ViewServiceTag).toClass(DefaultViewService).inSingletonLifetime();
		serviceCollection.tryBind(RouterTag).toClass(DefaultRouter).inSingletonLifetime();

		const serviceProvider = serviceCollection.build();

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
		await serviceProvider.get(DiagnosticsServiceTag).start();
		await serviceProvider.get(RouteRegistryTag).start(rootRoute);
		await serviceProvider.get(RouterTag).start();
		await serviceProvider.get(RenderServiceTag).start();
		await serviceProvider.get(ViewServiceTag).start();

		// start plugins
		for (const plugin of plugins) {
			if (!plugin.onStarting) {
				continue;
			}

			await plugin.onStarting(serviceProvider);
		}

		// start application
		if (this.onStarting) {
			await this.onStarting(serviceProvider);
		}

		// wait for exit?
		//  - browser - new api to stop running app? `run` returning stop function?
		//  - ssr - after router is idle?
	}

	public run(errorHandler?: (error: unknown) => void): void {
		errorHandler = errorHandler || (reason => console.error('fatal error', reason));

		this.runAsync()
			.catch(errorHandler);
	}
}
