// Means this is on render page, but not on Main or 404
export let isNavbarPage: boolean;

let isNavbarVisible: boolean;
let navbarHeight: number;

const navbarId = 'navbar';

export const initNavbar = () => {
	isNavbarVisible = false;

	const block = document.getElementById(navbarId);

	if (!block) return;

	isNavbarPage = true;

	// hide navbar above the screen
	navbarHeight = block.offsetHeight;
	block.style.top = `-${navbarHeight}px`;

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

export const makeNavbarVisible = () => {
	const nav = document.getElementById(navbarId);

	if (!nav) return;

	if (isNavbarVisible) {
		isNavbarVisible = false;
		nav.style.top = `-${navbarHeight}px`;
	} else {
		isNavbarVisible = true;
		nav.style.top = `60px`;
	}
};

export const updateNavbar = () => {
	const block = document.getElementById(navbarId);

	if (!block) return;

	navbarHeight = block.offsetHeight;

	if (!isNavbarVisible) {
		block.style.top = `-${navbarHeight}px`;
	}
};
