import {
	FileAddEvent,
	FileChangeEvent,
	FileRemovedEvent,
	WebSocketEvent,
} from '../shared/types/websocket-event';
import { isNavbarPage, updateNavbar } from './render-navbar';

export const startWebSoket = (port: string) => {
	const ws = new WebSocket(`ws://localhost:${port}`);

	ws.onopen = () => {
		ws.send(`Client, connected on ${window.location.toString()}!`);
	};

	ws.onmessage = (event) => {
		const messageData = JSON.parse(event.data) as WebSocketEvent;

		switch (messageData.type) {
			case 'file_added': {
				onFileAdd(messageData as FileAddEvent);
				break;
			}
			case 'file_change': {
				onFileChange(messageData as FileChangeEvent);
				break;
			}
			case 'file_remove': {
				onFileDelete(messageData as FileRemovedEvent);
				break;
			}
		}

		console.log(`Message from server: ${messageData.type}`);
	};

	ws.onclose = () => {
		console.log('Connection closed');
		pollingServer();
	};
};

const onFileChange = (event: FileChangeEvent) => {
	const routes: string[] = [];

	if (event.data.route) routes.push(event.data.route);
	if (event.data.affected_routes) routes.push(...event.data.affected_routes);

	if (routes.includes(window.location.pathname)) {
		window.location.reload();
	}
};

const onFileAdd = (event: FileAddEvent) => {
	const { route, file, title } = event.data;

	console.log(`File "${file}" is created`);

	const nav = findNavigationDiv();

	if (!nav) return;

	let iAmDoneHere: boolean = false;

	Array.from(nav.children).forEach((navLink) => {
		if (iAmDoneHere) return;

		if (navLink! instanceof HTMLDivElement) {
			const link = navLink.children.item(1) as HTMLAnchorElement;

			const url = new URL(link.href);

			if (route < url.pathname) {
				const newNL = document.createElement('div');
				newNL.classList.add('navigation-link');

				const newS = document.createElement('span');
				newS.innerText = file;

				const newA = document.createElement('a');
				newA.href = route;
				newA.innerText = title || 'title not found';

				newNL.append(newS, newA);
				nav.insertBefore(newNL, navLink);
				updateNavbar();

				iAmDoneHere = true;
			}
		}
	});
};

// <div class="navigation-link"><span>${v.file}:</span><a href="/${k}">${v.title || 'title not found'}</a></div>

const onFileDelete = (event: FileRemovedEvent) => {
	const file = event.data.file;

	console.log(`File "${file}" is removed`);

	const nav = findNavigationDiv();

	if (!nav) return;

	let iAmDoneHere: boolean = false;

	Array.from(nav.children).forEach((navLink) => {
		if (iAmDoneHere) return;

		if (navLink! instanceof HTMLDivElement) {
			const span = navLink.children.item(0) as HTMLSpanElement;

			if (span.innerText === file) {
				navLink.remove();
				updateNavbar();
				iAmDoneHere = true;
			}
		}
	});
};

const findNavigationDiv = (): HTMLDivElement | undefined => {
	let div: HTMLDivElement | undefined;

	if (isNavbarPage) {
		div = document.getElementById('navbar') as HTMLDivElement;
	} else {
		div = document.getElementById('navigation') as HTMLDivElement;
	}

	return div;
};

const pollingServer = () => {
	const port = window.location.port;
	let pollingInterval = 1000;

	const poll = () => {
		fetch('/ads-health')
			.then((res) => {
				if (res.ok) {
					console.log('server up, reconnect');
					startWebSoket(port);
				} else {
					console.log('server down, continue');
					setTimeout(poll, pollingInterval);
					pollingInterval = Math.min(pollingInterval * 2, 60000);
				}
			})
			.catch((err) => {
				console.log('error: ' + err + ', continue');
				setTimeout(poll, pollingInterval);
				pollingInterval = Math.min(pollingInterval * 2, 60000);
			});
	};

	poll();
};
