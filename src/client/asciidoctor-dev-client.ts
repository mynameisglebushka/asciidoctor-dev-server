import { initRouter, manager_click } from './render-router';
import { startWebSoket } from './websoket';

declare const __PORT__: string;

const port = __PORT__;

startWebSoket(port);

window.addEventListener('load', () => {
	const btn = document.getElementById('router-manager') as HTMLButtonElement;

	if (btn) {
		initRouter();
		btn.addEventListener('click', () => {
			manager_click();
		});
	}
});
