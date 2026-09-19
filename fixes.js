/* Robust interaction patch: no layout changes, pointer-safe input handling. */
(function () {
    'use strict';
    const DB_KEY = 'NexBlock_UserData_v1';

    function readData() {
        try {
            const saved = JSON.parse(localStorage.getItem(DB_KEY) || '{}');
            return { ...saved, and: Number(saved.and) || 0, createdMaps: Array.isArray(saved.createdMaps) ? saved.createdMaps : [] };
        } catch (_) {
            return { and: 0, vipPass: false, createdMaps: [] };
        }
    }
    function saveData(data) { localStorage.setItem(DB_KEY, JSON.stringify(data)); }
    function renderCurrency(value) {
        document.querySelectorAll('.currency-amount').forEach((node) => { node.textContent = Number(value).toLocaleString(); });
    }

    function initClicker() {
        const target = document.getElementById('main-clicker-target');
        if (!target || target.dataset.pointerPatch) return;
        target.dataset.pointerPatch = 'true';
        // Remove inline handlers so touch does not produce a second click.
        target.removeAttribute('onmousedown');
        target.removeAttribute('ontouchstart');
        target.addEventListener('pointerdown', (event) => {
            event.preventDefault();
            const data = readData();
            data.and += 1;
            saveData(data);
            renderCurrency(data.and);
            const text = document.createElement('div');
            text.className = 'floating-text';
            text.textContent = '+1';
            text.style.left = `${event.clientX - 20}px`;
            text.style.top = `${event.clientY - 20}px`;
            document.body.appendChild(text);
            setTimeout(() => text.remove(), 1000);
        });
        renderCurrency(readData().and);
    }

    function initEditor() {
        const canvas = document.getElementById('editor-canvas');
        if (!canvas || canvas.dataset.pointerPatch) return;
        canvas.dataset.pointerPatch = 'true';
        const ctx = canvas.getContext('2d');
        const tiles = [];
        const size = 40;
        let tool = 'block', camX = 0, camY = 0, active = false, pan = false, lastX = 0, lastY = 0;

        // The editor joystick is a movement control, not an installation tool.
        document.getElementById('editor-joystick')?.closest('.editor-bottom-controls')?.remove();
        document.querySelectorAll('.tool-btn').forEach((button) => button.addEventListener('click', () => {
            document.querySelectorAll('.tool-btn').forEach((item) => item.classList.remove('selected'));
            button.classList.add('selected');
            tool = button.dataset.type || 'block';
            if (tool === 'delete') tool = 'erase';
        }));

        function resize() {
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            canvas.width = Math.max(1, Math.round(rect.width * dpr));
            canvas.height = Math.max(1, Math.round(rect.height * dpr));
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        function point(event) {
            const rect = canvas.getBoundingClientRect();
            return { x: event.clientX - rect.left, y: event.clientY - rect.top };
        }
        function paint(event) {
            const p = point(event);
            const x = Math.floor((p.x - camX) / size), y = Math.floor((p.y - camY) / size);
            const index = tiles.findIndex((item) => item.x === x && item.y === y);
            if (tool === 'erase') { if (index >= 0) tiles.splice(index, 1); return; }
            if (index < 0) tiles.push({ x, y, type: tool }); else tiles[index].type = tool;
        }
        canvas.addEventListener('pointerdown', (event) => {
            event.preventDefault(); canvas.setPointerCapture?.(event.pointerId);
            active = true; pan = event.button === 2; lastX = event.clientX; lastY = event.clientY;
            if (!pan) paint(event);
        });
        canvas.addEventListener('pointermove', (event) => {
            if (!active) return;
            if (pan) { camX += event.clientX - lastX; camY += event.clientY - lastY; lastX = event.clientX; lastY = event.clientY; }
            else paint(event);
        });
        ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((name) => canvas.addEventListener(name, () => { active = false; pan = false; }));
        canvas.addEventListener('contextmenu', (event) => event.preventDefault());
        window.addEventListener('resize', resize); resize();
        function render() {
            const rect = canvas.getBoundingClientRect();
            ctx.clearRect(0, 0, rect.width, rect.height); ctx.save(); ctx.translate(camX, camY);
            ctx.strokeStyle = 'rgba(255,255,255,.05)';
            for (let x = Math.floor(-camX / size) * size; x < rect.width - camX; x += size) { ctx.beginPath(); ctx.moveTo(x, -camY); ctx.lineTo(x, rect.height - camY); ctx.stroke(); }
            for (let y = Math.floor(-camY / size) * size; y < rect.height - camY; y += size) { ctx.beginPath(); ctx.moveTo(-camX, y); ctx.lineTo(rect.width - camX, y); ctx.stroke(); }
            tiles.forEach((item) => { ctx.fillStyle = item.type === 'danger' ? '#ff4500' : '#00ffcc'; ctx.fillRect(item.x * size + 1, item.y * size + 1, size - 2, size - 2); });
            ctx.restore(); requestAnimationFrame(render);
        }
        requestAnimationFrame(render);
        window.saveMap = function () {
            if (!tiles.length) { window.UI?.showToast?.('배치된 블록이 없습니다.', 'danger'); return; }
            const data = readData(); data.createdMaps.push(tiles.map((item) => ({ ...item }))); saveData(data);
            window.UI?.showToast?.('맵이 성공적으로 저장되었습니다!', 'success');
        };
    }

    function initPlayJoystick() {
        const base = document.getElementById('play-joystick'), knob = document.getElementById('play-knob');
        if (!base || !knob || base.dataset.pointerPatch) return;
        base.dataset.pointerPatch = 'true';
        // Clone removes the old touch listeners from script.js.
        const fresh = base.cloneNode(true); base.replaceWith(fresh);
        const pad = fresh, handle = fresh.querySelector('#play-knob');
        let active = false, key = null, pointerId = null;
        const max = 40;
        function release() {
            if (key) window.dispatchEvent(new KeyboardEvent('keyup', { key }));
            key = null; active = false; handle.style.transform = 'translate(-50%, -50%)';
        }
        function move(event) {
            const r = pad.getBoundingClientRect();
            let dx = event.clientX - (r.left + r.width / 2), dy = event.clientY - (r.top + r.height / 2);
            const distance = Math.hypot(dx, dy) || 1, scale = Math.min(1, max / distance); dx *= scale; dy *= scale;
            handle.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
            const next = dx < -2 ? 'a' : dx > 2 ? 'd' : null;
            if (next !== key) { if (key) window.dispatchEvent(new KeyboardEvent('keyup', { key })); if (next) window.dispatchEvent(new KeyboardEvent('keydown', { key: next })); key = next; }
        }
        pad.addEventListener('pointerdown', (event) => { event.preventDefault(); active = true; pointerId = event.pointerId; pad.setPointerCapture?.(pointerId); move(event); });
        pad.addEventListener('pointermove', (event) => { if (active) { event.preventDefault(); move(event); } });
        ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((name) => pad.addEventListener(name, release));
    }

    document.addEventListener('DOMContentLoaded', () => {
        initClicker();
        initEditor();
        // Run after play.html's original initializer, then replace its touch listeners.
        setTimeout(initPlayJoystick, 0);
    });
}());
