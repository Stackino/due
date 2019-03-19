import { Routable } from "./routing";

export interface Page<TComponent> extends Routable {
	component: TComponent;
}
