// Means this is on render page, but not on Main or 404
let isNavbarPage;
let isNavbarVisible;
let navbarHeight;
const navbarId = 'navbar';
const initNavbar = () => {
    isNavbarVisible = false;
    const block = document.getElementById(navbarId);
    if (!block)
        return;
    isNavbarPage = true;
    // hide navbar above the screen
    navbarHeight = block.offsetHeight;
    block.style.top = `-${navbarHeight}px`;
    // mark current page
    Array.from(block.children).forEach((element) => {
        if (element instanceof HTMLDivElement) {
            const span = element.children.item(0);
            if (!span)
                return;
            if (span instanceof HTMLSpanElement) {
                const i = span.innerText.lastIndexOf('.');
                if (!i)
                    return;
                const path = span.innerText.slice(0, i);
                if (window.location.pathname === '/' + path) {
                    element.style.fontWeight = 'bold';
                }
            }
        }
    });
};
const makeNavbarVisible = () => {
    const nav = document.getElementById(navbarId);
    if (!nav)
        return;
    if (isNavbarVisible) {
        isNavbarVisible = false;
        nav.style.top = `-${navbarHeight}px`;
    }
    else {
        isNavbarVisible = true;
        nav.style.top = `60px`;
    }
};
const updateNavbar = () => {
    const block = document.getElementById(navbarId);
    if (!block)
        return;
    navbarHeight = block.offsetHeight;
    if (!isNavbarVisible) {
        block.style.top = `-${navbarHeight}px`;
    }
};

// Servers
const socketClientEvent = (event) => {
    return JSON.stringify(event);
};

const startWebSoket = (port) => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    ws.onopen = () => {
        ws.send(socketClientEvent({
            type: 'connect',
            data: {
                path: document.location.pathname,
            },
        }));
    };
    ws.onmessage = (event) => {
        const messageData = JSON.parse(event.data);
        switch (messageData.type) {
            case 'file_added': {
                onFileAdd(messageData);
                break;
            }
            case 'file_change': {
                onFileChange(messageData);
                break;
            }
            case 'file_remove': {
                onFileDelete(messageData);
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
const onFileChange = (event) => {
    const routes = [];
    if (event.data.route)
        routes.push(event.data.route);
    if (event.data.affected_routes)
        routes.push(...event.data.affected_routes);
    const originalPath = window.location.pathname;
    const extensionStart = originalPath.indexOf('.', originalPath.lastIndexOf('/') !== -1
        ? originalPath.lastIndexOf('/')
        : 0);
    let basePath = '';
    if (extensionStart !== -1) {
        basePath = originalPath.slice(0, extensionStart);
    }
    for (const route of routes) {
        if (route === originalPath)
            window.location.reload();
        if (basePath !== '' || route === basePath)
            window.location.reload();
    }
};
const onFileAdd = (event) => {
    const { route, file, title } = event.data;
    console.log(`File "${file}" is created`);
    const nav = findNavigationDiv();
    if (!nav)
        return;
    let iAmDoneHere = false;
    Array.from(nav.children).forEach((navLink) => {
        if (iAmDoneHere)
            return;
        if (navLink instanceof HTMLDivElement) {
            const link = navLink.children.item(1);
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
const onFileDelete = (event) => {
    const file = event.data.file;
    console.log(`File "${file}" is removed`);
    const nav = findNavigationDiv();
    if (!nav)
        return;
    let iAmDoneHere = false;
    Array.from(nav.children).forEach((navLink) => {
        if (iAmDoneHere)
            return;
        if (navLink instanceof HTMLDivElement) {
            const span = navLink.children.item(0);
            if (span.innerText === file) {
                navLink.remove();
                updateNavbar();
                iAmDoneHere = true;
            }
        }
    });
};
const findNavigationDiv = () => {
    let div;
    if (isNavbarPage) {
        div = document.getElementById('navbar');
    }
    else {
        div = document.getElementById('navigation');
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
            }
            else {
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

const port = __PORT__;
startWebSoket(port);
window.addEventListener('load', () => {
    const btn = document.getElementById('navigation-manager');
    if (btn) {
        initNavbar();
        btn.addEventListener('click', () => {
            makeNavbarVisible();
        });
    }
});
