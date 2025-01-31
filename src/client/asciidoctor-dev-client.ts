import { initNavbar, makeNavbarVisible } from './render-navbar';
import { startWebSoket } from './websoket';

declare const __PORT__: string;

const port = __PORT__;

startWebSoket(port);

window.addEventListener('load', () => {
	const btn = document.getElementById(
		'navigation-manager',
	) as HTMLButtonElement;

	if (btn) {
		initNavbar();
		btn.addEventListener('click', () => {
			makeNavbarVisible();
		});
	}
});
