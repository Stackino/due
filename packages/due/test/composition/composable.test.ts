import 'jest';
import 'reflect-metadata';
import { DiagnosticsServiceTag, DefaultDiagnosticsService, LayoutRouteDeclaration, PageRouteDeclaration, Composable, delay, ServiceProvider, ServiceCollection } from '../../src';
import { observable, runInAction } from 'mobx';

class MockComposable extends Composable {

	report: string[] = [];

	timer = this.$timer(250, async () => {
		this.report.push('timer tick');
	});

	@observable
	reactionTrigger = '';

	reaction = this.$reaction(() => this.reactionTrigger, data => {
		this.report.push(`reaction tick ${data}`);
	});

}

async function setup(): Promise<[ServiceProvider]> {
	const serviceCollection = new ServiceCollection();
	serviceCollection.bind(DiagnosticsServiceTag).toClass(DefaultDiagnosticsService).inSingletonLifetime();

	const serviceProvider = serviceCollection.build();

	return [serviceProvider];
}

test('timer is disabled by default', async () => {
	const [serviceProvider] = await setup();

	const composable = serviceProvider.createFromClass(MockComposable);
	expect(composable.timer.enabled).toBe(false);
	expect(composable.timer.running).toBe(false);

	expect(composable.report.length).toBeLessThanOrEqual(0);
});

test('timer is ticking', async () => {
	const [serviceProvider] = await setup();

	const composable = serviceProvider.createFromClass(MockComposable);
	expect(composable.timer.enabled).toBe(false);
	expect(composable.timer.running).toBe(false);

	composable.timer.enable();
	expect(composable.timer.enabled).toBe(true);
	expect(composable.timer.running).toBe(false);

	await delay(600);

	composable.timer.disable();
	expect(composable.timer.enabled).toBe(false);
	expect(composable.timer.running).toBe(false);

	expect(composable.report.length).toBe(2);
	expect(composable.report[0]).toBe('timer tick');
	expect(composable.report[1]).toBe('timer tick');
});

test('reaction is disabled by default', async () => {
	const [serviceProvider] = await setup();

	const composable = serviceProvider.createFromClass(MockComposable);
	expect(composable.reaction.enabled).toBe(false);
	expect(composable.reaction.running).toBe(false);

	expect(composable.report.length).toBeLessThanOrEqual(0);
});

test('reaction is reacting', async () => {
	const [serviceProvider] = await setup();

	const composable = serviceProvider.createFromClass(MockComposable);
	expect(composable.reaction.enabled).toBe(false);
	expect(composable.reaction.running).toBe(false);

	composable.reaction.enable();
	expect(composable.reaction.enabled).toBe(true);
	expect(composable.reaction.running).toBe(false);

	composable.reactionTrigger = 'foo';

	runInAction(() => {
		composable.reactionTrigger = 'baz';
		composable.reactionTrigger = 'bar';
	});

	// execution is delayed
	await delay(10);

	composable.reaction.disable();
	expect(composable.reaction.enabled).toBe(false);
	expect(composable.reaction.running).toBe(false);

	expect(composable.report.length).toBe(2);
	expect(composable.report[0]).toBe('reaction tick foo');
	expect(composable.report[1]).toBe('reaction tick bar');
});
