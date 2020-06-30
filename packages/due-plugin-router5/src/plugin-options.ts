import { Tag } from '@stackino/due';

export const Router5PluginOptionsTag = new Tag<Router5PluginOptions>('Stackino router5 plugin options');

export interface Router5PluginOptions {
	base?: string;
}