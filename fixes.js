/* Targeted interaction fixes. Keeps the existing HTML/CSS and visual layout unchanged. */
(function () {
    const DB_KEY = 'NexBlock_UserData_v1';

    function readData() {
        try {
            const value = JSON.parse(localStorage.getItem(DB_KEY) || '{}');
            return { and: Number(value.and) || 0, ...value };
        } catch (_) {
            return { and: 0, vipPass: false, createdMaps: [] };
        }
    }

    function writeData(data) {
        localStorage.setItem(DB_KEY, JSON.stringify(data));
    }

    function refreshCurrency(value) {
        document.querySelectorAll('.currency-amount').forEach((element) => {
            element.textContent = Number(value).toLocaleString();
        });
    }

    // clicker.html: use one pointer path for mouse and touch. The old inline
    // touch/mouse handlers could be fired twice or fail on browsers without a
    // usable client coordinate on the event object.
    window.triggerClick = function (event) {
        if (event && event.preventDefault) event.preventDefault();
        const data = readData();
        const amount = 1;
        data.and += amount;
        writeData(data);
        refreshCurrency(data.and);

        const x = event && Number.isFinite(event.clientX) ? event.clientX : window.innerWidth / 2;
        const y = event && Number.isFinite(event.clientY) ? event.clientY : window.innerHeight / 2;
        const text = document.createElement('div');
        text.className = 'floating-text';
        text.textContent = `+${amount}`;
        text.style.left = `${x - 20}px`;
        text.style.top = `${y - 20}px`;
        document.body.appendChild(text);
        window.setTimeout(() => text.remove(), 1000);
    };

    function initEditorFix() {
        const canvas = document.getElementById('editor-canvas');
        if (!canvas || canvas.dataset.interactionFixed) return;
        canvas.dataset.interactionFixed = 'true';
        const ctx = canvas.getContext('2d');
        const tiles = [];
        const tileSize = 40;
        let tool = 'block';
        let camX = 0, camY = 0;
        let drawing = false, panning = false, lastX = 0, lastY = 0;

        document.querySelectorAll('.tool-btn').forEach((button) => {
            button.addEventListener('click', () => {
                document.querySelectorAll('.tool-btn').forEach((b) => b.classList.remove('selected'));
                button.classList.add('selected');
                // The markup calls this field data-type (not data-tool).
                tool = button.dataset.type || button.dataset.tool || 'block';
                if (tool === 'delete') tool = 'erase';
            });
        });

        function resize() {
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            canvas.width = Math.round(rect.width * dpr);
            canvas.height = Math.round(rect.height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        resize();
        window.addEventListener('resize', resize);

        function position(event) {
            const rect = canvas.getBoundingClientRect();
            // Convert client coordinates to CSS pixels, not backing-store pixels.
            return {
                x: (event.clientX - rect.left) * (rect.width ? canvas.width / (rect.width * (window.devicePixelRatio || 1)) : 1),
                y: (event.clientY - rect.top) * (rect.height ? canvas.height / (rect.height * (window.devicePixelRatio || 1)) : 1)
            };
        }

        function paint(event) {
            const point = position(event);
            const x = Math.floor((point.x - camX) / tileSize);
            const y = Math.floor((point.y - camY) / tileSize);
            const index = tiles.findIndex((tile) => tile.x === x && tile.y === y);
            if (tool === 'erase') {
                if (index !== -1) tiles.splice(index, 1);
            } else if (index === -1) {
                tiles.push({ x, y, type: tool });
            } else {
                tiles[index].type = tool;
            }
        }

        canvas.addEventListener('pointerdown', (event) => {
            event.preventDefault();
            canvas.setPointerCapture?.(event.pointerId);
            lastX = event.clientX; lastY = event.clientY;
            panning = event.button === 2;
            drawing = true;
            if (!panning) paint(event);
        });
        canvas.addEventListener('pointermove', (event) => {
            if (!drawing) return;
            if (panning) {
                camX += event.clientX - lastX;
                camY += event.clientY - lastY;
                lastX = event.clientX; lastY = event.clientY;
            } else {
                paint(event);
            }
        });
        ['pointerup', 'pointercancel', 'pointerleave'].forEach((name) => {
            canvas.addEventListener(name, () => { drawing = false; panning = false; });
        });
        canvas.addEventListener('contextmenu', (event) => event.preventDefault());

        function render() {
            const rect = canvas.getBoundingClientRect();
            const width = rect.width, height = rect.height;
            ctx.clearRect(0, 0, width, height);
            ctx.save(); ctx.translate(camX, camY);
            ctx.strokeStyle = 'rgba(255,255,255,.05)';
            for (let x = Math.floor(-camX / tileSize) * tileSize; x < width - camX; x += tileSize) {
                ctx.beginPath(); ctx.moveTo(x, -camY); ctx.lineTo(x, height - camY); ctx.stroke();
            }
            for (let y = Math.floor(-camY / tileSize) * tileSize; y < height - camY; y += tileSize) {
                ctx.beginPath(); ctx.moveTo(-camX, y); ctx.lineTo(width - camX, y); ctx.stroke();
            }
            tiles.forEach((tile) => {
                ctx.fillStyle = tile.type === 'danger' ? '#ff4500' : tile.type === 'spawn' ? '#ff00ff' : '#00ffcc';
                ctx.fillRect(tile.x * tileSize + 1, tile.y * tileSize + 1, tileSize - 2, tileSize - 2);
            });
            ctx.restore();
            requestAnimationFrame(render);
        }
        requestAnimationFrame(render);

        window.saveMap = function () {
            if (!tiles.length) {
                window.UI?.showToast?.('배치된 블록이 없습니다.', 'danger');
                return;
            }
            const data = readData();
            data.createdMaps = Array.isArray(data.createdMaps) ? data.createdMaps : [];
            data.createdMaps.push(tiles.map((tile) => ({ ...tile })));
            writeData(data);
            window.UI?.showToast?.('맵이 성공적으로 저장되었습니다!', 'success');
        };
    }

    function initJoystickFix() {
        const base = document.getElementById('play-joystick');
        const knob = document.getElementById('play-knob');
        if (!base || !knob || base.dataset.pointerFixed) return;
        base.dataset.pointerFixed = 'true';
        let active = false;
        const max = 40;
        const move = (event) => {
            const rect = base.getBoundingClientRect();
            const dx0 = event.clientX - (rect.left + rect.width / 2);
            const dy0 = event.clientY - (rect.top + rect.height / 2);
            const distance = Math.hypot(dx0, dy0) || 1;
            const scale = Math.min(1, max / distance);
            const dx = dx0 * scale;
            const dy = dy0 * scale;
            knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
            // Feed the existing game loop's keyboard state; this also works on desktop.
            window.dispatchEvent(new KeyboardEvent('keyup', { key: 'a' }));
            window.dispatchEvent(new KeyboardEvent('keyup', { key: 'd' }));
            if (dx < -2) window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
            if (dx > 2) window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
        };
        base.addEventListener('pointerdown', (event) => {
            event.preventDefault(); active = true; base.setPointerCapture?.(event.pointerId); move(event);
        });
        base.addEventListener('pointermove', (event) => { if (active) { event.preventDefault(); move(event); } });
        const end = () => {
            active = false;
            knob.style.transform = 'translate(-50%, -50%)';
            window.dispatchEvent(new KeyboardEvent('keyup', { key: 'a' }));
            window.dispatchEvent(new KeyboardEvent('keyup', { key: 'd' }));
        };
        base.addEventListener('pointerup', end);
        base.addEventListener('pointercancel', end);
        base.addEventListener('lostpointercapture', end);
    }

    document.addEventListener('DOMContentLoaded', () => {
        initEditorFix();
        // play.html initializes its original physics first; the pointer bridge
        // above then makes the same joystick usable with mouse and touch.
        window.setTimeout(initJoystickFix, 0);
    });
}());
