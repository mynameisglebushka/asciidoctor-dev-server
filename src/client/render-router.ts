export let routerOnPage: boolean;

let isRouterVisible: boolean;
let blockHeight: number;

export const manager_click = () => {
	const router = document.getElementById('router');

	if (!router) return;

	if (isRouterVisible) {
		isRouterVisible = false;
		router.style.top = `-${blockHeight}px`;
	} else {
		isRouterVisible = true;
		router.style.top = `60px`;
	}
};

export const initRouter = () => {
	isRouterVisible = false;

	const block = document.getElementById('router');

	if (!block) return;

	routerOnPage = true;

	// hide router above the screen
	blockHeight = block.offsetHeight;
	block.style.top = `-${blockHeight}px`;

	// mark current page
	Array.from(block.children).forEach((element) => {
		if (element instanceof HTMLDivElement) {
			const span = element.children.item(0);

			if (!span) return;

			if (span instanceof HTMLSpanElement) {
				const i = span.innerText.lastIndexOf('.');

				if (!i) return;

				const path = span.innerText.slice(0, i);

				if (window.location.pathname === '/' + path) {
					element.style.fontWeight = 'bold';
				}
			}
		}
	});
};
