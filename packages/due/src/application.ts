import { BindingScope, Container, ContainerTag, DefaultContainer } from './ioc';
import { DefaultDiagnosticsService, DiagnosticsServiceTag } from './diagnostics';
import { RouterTag, RouteBuilder, RootRouteDeclaration, RouteRegistryTag, DefaultRouteRegistry, DefaultRouter } from './routing';
import { RenderServiceTag, RootPageComponent, ViewServiceTag, DefaultViewService } from './rendering';
import { Provider, executeProvider } from './tools';
import { Plugin } from './plugin';
import { Page } from './page';

export abstract class Application {
	protected abstract configurePlugins(): Provider<Plugin[]>;
	protected abstract configureServices(services: Container): void;
	protected abstract configureRoutes(builder: RouteBuilder): Promise<void>;
	protected abstract start(services: Container): Promise<void>;
	protected abstract stop(services: Container): Promise<void>;

	private async runAsync(): Promise<void> {
		const services = new DefaultContainer();
		services.bindConstantValue(ContainerTag, services);

		// configure plugins
		const plugins = await executeProvider(this.configurePlugins());
		for (const plugin of plugins) {
			plugin.configureServices(services);
		}

		// configure services
		this.configureServices(services);
		services.tryBind(DiagnosticsServiceTag, DefaultDiagnosticsService, BindingScope.singleton);
		services.tryBind(RouteRegistryTag, DefaultRouteRegistry, BindingScope.singleton);
		services.tryBind(ViewServiceTag, DefaultViewService, BindingScope.singleton);
		services.tryBind(RouterTag, DefaultRouter, BindingScope.singleton);

		// configure routes
		const builder = new RouteBuilder();
		await this.configureRoutes(builder);
		const rootRoute: RootRouteDeclaration = new RootRouteDeclaration(
			() => {
				class RootPage implements Page<symbol> {
					enter(): Promise<void> {
						return Promise.resolve();
					}

					component = RootPageComponent;
				}

				return RootPage;
			},
			() => builder.build(rootRoute)
		);

		// start core services
		await services.get(DiagnosticsServiceTag).start();
		await services.get(RouteRegistryTag).start(rootRoute);
		await services.get(RouterTag).start();
		await services.get(RenderServiceTag).start();
		await services.get(ViewServiceTag).start();

		// start plugins
		for (const plugin of plugins) {
			if (!plugin.start) {
				continue;
			}

			plugin.start(services);
		}

		// start application
		this.start(services);
	}

	public run(errorHandler?: (error: unknown) => void): void {
		errorHandler = errorHandler || (reason => console.error('fatal error', reason));

		this.runAsync()
			.catch(errorHandler);
	}
}
