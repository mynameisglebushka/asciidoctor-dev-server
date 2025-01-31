import {
	FileAddEvent,
	FileChangeEvent,
	FileRemovedEvent,
	WebSocketEvent,
} from '../shared/types/websocket-event';
import { routerOnPage, updateRouter } from './render-router';

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
	};
};

const onFileChange = (event: FileChangeEvent) => {
	const path = event.data.route;

	if (window.location.pathname !== path) {
		console.log(
			`current page "${window.location.pathname}" not affected by "${path}" file change`,
		);
		return;
	}

	console.log('Page content was changed');
	window.location.reload();
};

const onFileAdd = (event: FileAddEvent) => {
	const { route, file, title } = event.data;

	console.log(`File "${file}" is created`);

	const router = findRouterDiv();

	if (!router) return;

	let iAmDoneHere: boolean = false;

	Array.from(router.children).forEach((routerLink) => {
		if (iAmDoneHere) return;

		if (routerLink! instanceof HTMLDivElement) {
			const link = routerLink.children.item(1) as HTMLAnchorElement;

			const url = new URL(link.href);

			if (route < url.pathname) {
				const newRL = document.createElement('div');
				newRL.classList.add('router-link');

				const newS = document.createElement('span');
				newS.innerText = file;

				const newA = document.createElement('a');
				newA.href = route;
				newA.innerText = title || 'title not found';

				newRL.append(newS, newA);
				router.insertBefore(newRL, routerLink);
				updateRouter();

				iAmDoneHere = true;
			}
		}
	});
};

// <div class="router-link"><span>${v.file}:</span><a href="/${k}">${v.title || 'title not found'}</a></div>

const onFileDelete = (event: FileRemovedEvent) => {
	const file = event.data.file;

	console.log(`File "${file}" is removed`);

	const router = findRouterDiv();

	if (!router) return;

	let iAmDoneHere: boolean = false;

	Array.from(router.children).forEach((routerLink) => {
		if (iAmDoneHere) return;

		if (routerLink! instanceof HTMLDivElement) {
			const span = routerLink.children.item(0) as HTMLSpanElement;

			if (span.innerText === file) {
				routerLink.remove();
				updateRouter();
				iAmDoneHere = true;
			}
		}
	});
};

const findRouterDiv = (): HTMLDivElement | undefined => {
	let div: HTMLDivElement | undefined;

	if (routerOnPage) {
		div = document.getElementById('router') as HTMLDivElement;
	} else {
		div = document.getElementById('main-router') as HTMLDivElement;
	}

	return div;
};
