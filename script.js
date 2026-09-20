/**
 * ============================================================================
 * CreateVerse Studio Pro - Ultimate Engine Core v3.0
 * Architecture: Entity-Component System (ECS) Inspired, OOP, Event-Driven
 * Modules: Math, Time, Logger, Physics, Renderer, GUI, Network, Input
 * ============================================================================
 */

/* ----------------------------------------------------------------------------
   [1] CORE MATH & UTILITIES
   ---------------------------------------------------------------------------- */
class Vector2 {
    constructor(x = 0, y = 0) { this.x = x; this.y = y; }
    add(v) { return new Vector2(this.x + v.x, this.y + v.y); }
    sub(v) { return new Vector2(this.x - v.x, this.y - v.y); }
    mult(n) { return new Vector2(this.x * n, this.y * n); }
    div(n) { return new Vector2(this.x / n, this.y / n); }
    mag() { return Math.sqrt(this.x * this.x + this.y * this.y); }
    normalize() { const m = this.mag(); return m === 0 ? new Vector2(0, 0) : this.div(m); }
    clone() { return new Vector2(this.x, this.y); }
    static distance(v1, v2) { return v1.sub(v2).mag(); }
}

const Utils = {
    generateUUID: () => 'part_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
    clamp: (val, min, max) => Math.max(min, Math.min(max, val)),
    lerp: (start, end, amt) => (1 - amt) * start + amt * end,
    hexToRgb: (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
    }
};

/* ----------------------------------------------------------------------------
   [2] ENGINE TIME & SYSTEM LOGGER
   ---------------------------------------------------------------------------- */
const Time = {
    deltaTime: 0,
    lastTime: 0,
    frameCount: 0,
    fps: 0,
    update: (currentTime) => {
        Time.deltaTime = (currentTime - Time.lastTime) / 1000; // in seconds
        Time.lastTime = currentTime;
        Time.frameCount++;
        if (Time.frameCount % 10 === 0) {
            Time.fps = Math.round(1 / Time.deltaTime);
            const fpsDisplay = document.getElementById('fps-display');
            if (fpsDisplay) fpsDisplay.innerText = `${Time.fps} FPS`;
        }
    }
};

const Logger = {
    log: (msg, type = 'info') => {
        const consoleEl = document.getElementById('console-logs');
        if (!consoleEl) return;
        const timeStr = new Date().toISOString().substring(11, 23);
        
        let icon = '<i class="fa-solid fa-circle-info text-primary"></i>';
        if (type === 'warning') icon = '<i class="fa-solid fa-triangle-exclamation text-gold"></i>';
        if (type === 'error') icon = '<i class="fa-solid fa-circle-xmark text-danger"></i>';

        const logHtml = `
            <div class="log-line ${type}">
                <span class="log-time">${timeStr}</span> ${icon} ${msg}
            </div>`;
        consoleEl.insertAdjacentHTML('beforeend', logHtml);
        consoleEl.scrollTop = consoleEl.scrollHeight;
    },
    info: (msg) => Logger.log(msg, 'info'),
    warn: (msg) => Logger.log(msg, 'warning'),
    error: (msg) => Logger.log(msg, 'error'),
    clear: () => { document.getElementById('console-logs').innerHTML = ''; }
};

/* ----------------------------------------------------------------------------
   [3] GAME OBJECT MODEL (Entities)
   ---------------------------------------------------------------------------- */
class BasePart {
    constructor(config) {
        this.id = config.id || Utils.generateUUID();
        this.name = config.name || 'Part';
        this.type = config.type || 'normal'; // normal, bounce, lava, clicker, spawn
        
        // Transform
        this.pos = new Vector2(config.x || 0, config.y || 0);
        this.size = new Vector2(config.w || 50, config.h || 50);
        this.rotation = 0;
        
        // Appearance
        this.color = config.color || '#a5b4fc';
        this.alpha = config.alpha !== undefined ? config.alpha : 0.0; // 0 = 불투명, 1 = 투명 (Roblox 방식)
        this.material = config.material || 'Plastic';
        
        // Physics
        this.anchored = config.anchored !== undefined ? config.anchored : true;
        this.canCollide = config.canCollide !== undefined ? config.canCollide : true;
        this.velocity = new Vector2(0, 0);
        this.mass = (this.size.x * this.size.y) / 100;
    }
}

/* ----------------------------------------------------------------------------
   [4] GLOBAL STATE MANAGEMENT
   ---------------------------------------------------------------------------- */
const STORAGE_KEY = 'CreateVerse_Studio_Pro_Data';

const AppState = {
    user: { peerId: Utils.generateUUID(), andBalance: 0 },
    workspace: { parts: [] },
    engine: {
        mode: 'edit', // 'edit' | 'play'
        camera: new Vector2(0, 0),
        zoom: 1.0,
        gridSnap: 25,
        gravity: 1200 // pixels per second squared
    },
    editor: {
        selectedPartId: null,
        activeTool: 'select', // select, move, scale
        isDragging: false,
        dragOffset: new Vector2(0, 0)
    }
};

/* ----------------------------------------------------------------------------
   [5] EDITOR GUI & DATA BINDING (Inspector & Explorer)
   ---------------------------------------------------------------------------- */
const EditorGUI = {
    init: () => {
        // 데이터 로드
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            AppState.user.andBalance = parsed.and || 0;
            if (parsed.parts && parsed.parts.length > 0) {
                AppState.workspace.parts = parsed.parts.map(p => new BasePart(p));
            } else {
                EditorGUI.createDefaultBaseplate();
            }
        } else {
            EditorGUI.createDefaultBaseplate();
        }
        
        document.getElementById('and-balance').innerText = `${AppState.user.andBalance} AND`;
        EditorGUI.syncExplorer();
        Logger.info('Workspace loaded successfully.');
    },

    createDefaultBaseplate: () => {
        AppState.workspace.parts = [
            new BasePart({ name: 'Baseplate', x: -1000, y: 150, w: 2000, h: 50, color: '#1e293b', anchored: true }),
            new BasePart({ name: 'SpawnLocation', x: 0, y: 100, w: 50, h: 50, type: 'spawn', color: 'transparent', anchored: true, canCollide: false }),
            new BasePart({ name: 'CoinBox', x: 200, y: -50, w: 100, h: 100, type: 'clicker', color: '#ffb300', anchored: true })
        ];
    },

    saveData: () => {
        const dataToSave = {
            and: AppState.user.andBalance,
            parts: AppState.workspace.parts
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    },

    syncExplorer: () => {
        const container = document.getElementById('workspace-children');
        if (!container) return;
        container.innerHTML = '';
        
        AppState.workspace.parts.forEach(part => {
            const isSelected = AppState.editor.selectedPartId === part.id;
            const node = document.createElement('div');
            node.className = `tree-node ${isSelected ? 'selected' : ''}`;
            
            let icon = 'fa-cube text-main';
            if (part.type === 'spawn') icon = 'fa-flag text-gold';
            if (part.type === 'lava') icon = 'fa-fire text-danger';
            if (part.type === 'bounce') icon = 'fa-angles-up text-success';
            if (part.type === 'clicker') icon = 'fa-sack-dollar text-gold';
            
            node.innerHTML = `<i class="fa-solid ${icon} node-icon"></i> ${part.name}`;
            node.onclick = () => EditorCore.selectPart(part.id);
            container.appendChild(node);
        });
    },

    syncInspector: () => {
        const part = AppState.workspace.parts.find(p => p.id === AppState.editor.selectedPartId);
        const emptyState = document.getElementById('prop-empty-state');
        const contentState = document.getElementById('prop-content');
        const targetName = document.getElementById('prop-target-name');

        if (!part) {
            emptyState.classList.remove('hidden');
            contentState.classList.add('hidden');
            targetName.innerText = 'Workspace';
            return;
        }

        emptyState.classList.add('hidden');
        contentState.classList.remove('hidden');
        targetName.innerText = part.name;

        // 양방향 데이터 바인딩 적용
        document.getElementById('prop-name').value = part.name;
        document.getElementById('prop-type').value = part.type;
        document.getElementById('prop-color').value = part.color !== 'transparent' ? part.color : '#ffffff';
        document.getElementById('prop-alpha').value = part.alpha;
        
        document.getElementById('prop-x').value = Math.round(part.pos.x);
        document.getElementById('prop-y').value = Math.round(part.pos.y);
        document.getElementById('prop-w').value = Math.round(part.size.x);
        document.getElementById('prop-h').value = Math.round(part.size.y);
        
        document.getElementById('prop-anchored').checked = part.anchored;
        document.getElementById('prop-collide').checked = part.canCollide;
    },

    showToast: (msg, isError = false) => {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<i class="fa-solid ${isError ? 'fa-triangle-exclamation text-danger' : 'fa-check text-success'}"></i> ${msg}`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    },

    spawnParticle: (x, y, text, color = '#ffd54f') => {
        const container = document.getElementById('particle-container');
        if (!container) return;
        const el = document.createElement('div');
        el.className = 'floating-coin-text';
        el.innerText = text;
        el.style.color = color;
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        container.appendChild(el);
        setTimeout(() => el.remove(), 1000);
    }
};

/* ----------------------------------------------------------------------------
   [6] EDITOR CORE LOGIC (Tools & Manipulation)
   ---------------------------------------------------------------------------- */
const EditorCore = {
    setTool: (tool) => {
        AppState.editor.activeTool = tool;
        document.querySelectorAll('.r-btn-large').forEach(b => b.classList.remove('active'));
        const btn = document.getElementById('tool-' + tool);
        if(btn) btn.classList.add('active');
        Logger.info(`Tool selected: ${tool.toUpperCase()}`);
    },

    selectPart: (id) => {
        AppState.editor.selectedPartId = id;
        EditorGUI.syncExplorer();
        EditorGUI.syncInspector();
    },

    insertPart: (type) => {
        const cam = AppState.engine.camera;
        const colors = { normal: '#5c6bc0', bounce: '#4caf50', lava: '#f44336', clicker: '#ffb300', spawn: 'transparent' };
        
        const newPart = new BasePart({
            type: type,
            name: type.charAt(0).toUpperCase() + type.slice(1) + 'Part',
            x: Math.floor(cam.x / AppState.engine.gridSnap) * AppState.engine.gridSnap,
            y: Math.floor(cam.y / AppState.engine.gridSnap) * AppState.engine.gridSnap,
            w: type === 'clicker' ? 100 : 50,
            h: type === 'clicker' ? 100 : 50,
            color: colors[type] || '#ffffff',
            canCollide: type !== 'spawn'
        });
        
        AppState.workspace.parts.push(newPart);
        EditorCore.selectPart(newPart.id);
        EditorCore.setTool('move');
        Logger.info(`Inserted new ${type} part.`);
    },

    deleteSelected: () => {
        if (!AppState.editor.selectedPartId) return;
        AppState.workspace.parts = AppState.workspace.parts.filter(p => p.id !== AppState.editor.selectedPartId);
        Logger.warn('Object deleted from Workspace.');
        EditorCore.selectPart(null);
    },

    updateProp: (key) => {
        const p = AppState.workspace.parts.find(part => part.id === AppState.editor.selectedPartId);
        if (!p) return;
        
        try {
            if (key === 'x') p.pos.x = parseFloat(document.getElementById('prop-x').value);
            if (key === 'y') p.pos.y = parseFloat(document.getElementById('prop-y').value);
            if (key === 'w') p.size.x = Math.max(5, parseFloat(document.getElementById('prop-w').value));
            if (key === 'h') p.size.y = Math.max(5, parseFloat(document.getElementById('prop-h').value));
            
            if (key === 'color') p.color = document.getElementById('prop-color').value;
            if (key === 'alpha') p.alpha = parseFloat(document.getElementById('prop-alpha').value);
            
            if (key === 'type') {
                p.type = document.getElementById('prop-type').value;
                p.name = p.type + 'Part'; // 이름 연동 변경
                document.getElementById('prop-name').value = p.name;
            }
            
            if (key === 'anchored') p.anchored = document.getElementById('prop-anchored').checked;
            if (key === 'canCollide') p.canCollide = document.getElementById('prop-collide').checked;

            EditorGUI.syncExplorer();
        } catch (e) {
            Logger.error('Property update failed.');
        }
    },

    toggleAnchor: () => {
        const p = AppState.workspace.parts.find(part => part.id === AppState.editor.selectedPartId);
        if (p) { p.anchored = !p.anchored; EditorGUI.syncInspector(); Logger.info(`Anchored: ${p.anchored}`); }
    },

    toggleCollide: () => {
        const p = AppState.workspace.parts.find(part => part.id === AppState.editor.selectedPartId);
        if (p) { p.canCollide = !p.canCollide; EditorGUI.syncInspector(); Logger.info(`CanCollide: ${p.canCollide}`); }
    }
};

/* ----------------------------------------------------------------------------
   [7] PHYSICS ENGINE (Delta-Time Based AABB Collision)
   ---------------------------------------------------------------------------- */
const Physics = {
    player: { pos: new Vector2(0,0), size: new Vector2(35, 35), vel: new Vector2(0,0), grounded: false },
    otherPlayers: {},

    update: (dt) => {
        if (AppState.engine.mode !== 'play') return;

        const p = Physics.player;
        const parts = AppState.workspace.parts;
        
        const moveSpeed = 400; // pixels per second
        const friction = 0.85;
        const jumpForce = -600;

        // 1. Input & Horizontal Movement
        let targetVx = 0;
        if (Input.keys['a'] || Input.joyX < -20) targetVx = -moveSpeed;
        else if (Input.keys['d'] || Input.joyX > 20) targetVx = moveSpeed;
        
        p.vel.x = Utils.lerp(p.vel.x, targetVx, 1 - Math.pow(friction, dt * 60));

        // 2. Vertical Movement & Gravity
        if ((Input.keys['w'] || Input.keys[' '] || Input.jump) && p.grounded) {
            p.vel.y = jumpForce;
            p.grounded = false;
        }
        p.vel.y += AppState.engine.gravity * dt;

        // 3. Collision Detection & Resolution (X-Axis)
        p.pos.x += p.vel.x * dt;
        parts.forEach(b => {
            if (b.canCollide && Physics.checkAABB(p, b)) {
                if (p.vel.x > 0) p.pos.x = b.pos.x - p.size.x;
                else if (p.vel.x < 0) p.pos.x = b.pos.x + b.size.x;
                p.vel.x = 0;
            }
        });

        // 4. Collision Detection & Resolution (Y-Axis)
        p.pos.y += p.vel.y * dt;
        p.grounded = false;
        
        parts.forEach(b => {
            // Trigger Volumes (Lava, etc)
            if (Physics.checkAABB(p, b)) {
                if (b.type === 'lava') {
                    Logger.warn('Player killed by LavaBlock.');
                    GameApp.respawn();
                    return;
                }
            }

            // Solid Collision
            if (b.canCollide && Physics.checkAABB(p, b)) {
                if (p.vel.y > 0) { // Falling down onto block
                    p.pos.y = b.pos.y - p.size.y;
                    p.grounded = true;
                    if (b.type === 'bounce') p.vel.y = jumpForce * 1.5; // 슈퍼 점프
                    else p.vel.y = 0;
                } 
                else if (p.vel.y < 0) { // Hitting ceiling
                    p.pos.y = b.pos.y + b.size.y;
                    p.vel.y = 0;
                }
            }
        });

        // 5. Unanchored Parts Physics
        parts.forEach(b => {
            if (!b.anchored) {
                b.velocity.y += AppState.engine.gravity * dt;
                b.pos.y += b.velocity.y * dt;
            }
        });

        // 6. Camera Follow (Smooth Lerp)
        const targetCamX = p.pos.x - window.innerWidth / 2;
        const targetCamY = p.pos.y - window.innerHeight / 2;
        AppState.engine.camera.x = Utils.lerp(AppState.engine.camera.x, targetCamX, 5 * dt);
        AppState.engine.camera.y = Utils.lerp(AppState.engine.camera.y, targetCamY, 5 * dt);

        // 7. Network Sync
        if (Math.random() < 0.2) {
            Network.broadcast({ type: 'move', id: AppState.user.peerId, pos: p.pos });
        }
    },

    checkAABB: (r1, r2) => {
        return r1.pos.x < r2.pos.x + r2.size.x &&
               r1.pos.x + r1.size.x > r2.pos.x &&
               r1.pos.y < r2.pos.y + r2.size.y &&
               r1.pos.y + r1.size.y > r2.pos.y;
    }
};

/* ----------------------------------------------------------------------------
   [8] RENDERING PIPELINE (Canvas 2D Context)
   ---------------------------------------------------------------------------- */
const Renderer = {
    canvas: document.getElementById('game-canvas'),
    ctx: null,

    init: () => {
        if (!Renderer.canvas) return;
        Renderer.ctx = Renderer.canvas.getContext('2d', { alpha: false }); // 최적화
        window.addEventListener('resize', Renderer.resize);
        Renderer.resize();
    },

    resize: () => {
        const parent = Renderer.canvas.parentElement;
        Renderer.canvas.width = parent.clientWidth;
        Renderer.canvas.height = parent.clientHeight;
    },

    draw: () => {
        const ctx = Renderer.ctx;
        const w = Renderer.canvas.width;
        const h = Renderer.canvas.height;
        const cam = AppState.engine.camera;

        // Background Clear (Sky color based on mode)
        ctx.fillStyle = AppState.engine.mode === 'edit' ? '#1a1a2e' : '#87CEEB'; // 에디터는 다크, 플레이는 하늘색
        ctx.fillRect(0, 0, w, h);
        
        ctx.save();
        ctx.translate(Math.floor(-cam.x), Math.floor(-cam.y));

        // Draw Grid (Edit Mode Only)
        if (AppState.engine.mode === 'edit') {
            ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            ctx.lineWidth = 1;
            const grid = AppState.engine.gridSnap;
            const startX = Math.floor(cam.x / grid) * grid;
            const startY = Math.floor(cam.y / grid) * grid;
            
            ctx.beginPath();
            for(let x = startX; x < startX + w + grid; x += grid) { ctx.moveTo(x, cam.y); ctx.lineTo(x, cam.y + h); }
            for(let y = startY; y < startY + h + grid; y += grid) { ctx.moveTo(cam.x, y); ctx.lineTo(cam.x + w, y); }
            ctx.stroke();
        }

        // Draw Parts (Workspace)
        AppState.workspace.parts.forEach(b => {
            const realAlpha = 1.0 - b.alpha; // 0 = opaque in Roblox
            if (realAlpha <= 0) return;
            
            ctx.globalAlpha = realAlpha;
            ctx.fillStyle = b.color;

            // Decals & Textures based on type
            if (b.type === 'spawn') {
                ctx.strokeStyle = '#f59e0b'; ctx.setLineDash([5, 5]); ctx.lineWidth = 2;
                ctx.strokeRect(b.pos.x, b.pos.y, b.size.x, b.size.y); ctx.setLineDash([]);
                ctx.fillStyle = '#f59e0b'; ctx.font = '10px Arial'; ctx.textAlign = 'center';
                ctx.fillText('SPAWN', b.pos.x + b.size.x/2, b.pos.y + b.size.y/2 + 4);
            } 
            else if (b.type === 'clicker') {
                ctx.fillRect(b.pos.x, b.pos.y, b.size.x, b.size.y);
                ctx.fillStyle = '#000'; ctx.font = 'bold 24px Arial'; ctx.textAlign = 'center';
                ctx.fillText('$', b.pos.x + b.size.x/2, b.pos.y + b.size.y/2 + 8);
            }
            else {
                ctx.fillRect(b.pos.x, b.pos.y, b.size.x, b.size.y);
                // Bevel effect
                ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1;
                ctx.strokeRect(b.pos.x, b.pos.y, b.size.x, b.size.y);
                ctx.strokeStyle = 'rgba(255,255,255,0.2)';
                ctx.beginPath(); ctx.moveTo(b.pos.x, b.pos.y + b.size.y); ctx.lineTo(b.pos.x, b.pos.y); ctx.lineTo(b.pos.x + b.size.x, b.pos.y); ctx.stroke();
            }
            
            ctx.globalAlpha = 1.0;

            // Draw Editor Gizmos (Selection)
            if (AppState.engine.mode === 'edit' && AppState.editor.selectedPartId === b.id) {
                ctx.strokeStyle = '#007acc'; ctx.lineWidth = 2;
                ctx.strokeRect(b.pos.x - 2, b.pos.y - 2, b.size.x + 4, b.size.y + 4);
                
                // Corner handles
                ctx.fillStyle = '#fff';
                const hs = 6;
                const corners = [
                    {x: b.pos.x, y: b.pos.y}, {x: b.pos.x + b.size.x, y: b.pos.y},
                    {x: b.pos.x, y: b.pos.y + b.size.y}, {x: b.pos.x + b.size.x, y: b.pos.y + b.size.y}
                ];
                corners.forEach(c => {
                    ctx.fillRect(c.x - hs/2, c.y - hs/2, hs, hs);
                    ctx.strokeRect(c.x - hs/2, c.y - hs/2, hs, hs);
                });
            }
        });

        // Draw Players (Play Mode)
        if (AppState.engine.mode === 'play') {
            // Network Players
            ctx.fillStyle = '#ef4444';
            ctx.textAlign = 'center'; ctx.font = '10px Arial';
            for (let id in Physics.otherPlayers) {
                let p = Physics.otherPlayers[id];
                ctx.fillRect(p.x, p.y, Physics.player.size.x, Physics.player.size.y);
                ctx.fillText(id.substring(0,5), p.x + Physics.player.size.x/2, p.y - 5);
            }
            // Local Player
            const lp = Physics.player;
            ctx.fillStyle = '#5c6bc0';
            ctx.fillRect(lp.pos.x, lp.pos.y, lp.size.x, lp.size.y);
            ctx.fillStyle = '#ffffff';
            ctx.fillText('Me', lp.pos.x + lp.size.x/2, lp.pos.y - 5);
        }

        ctx.restore();
        
        // Update Viewport HUD
        const coordDisplay = document.getElementById('coord-display');
        if (coordDisplay) coordDisplay.innerText = `X: ${Math.round(cam.x)}, Y: ${Math.round(cam.y)}`;
    }
};

/* ----------------------------------------------------------------------------
   [9] INPUT CONTROLLER (Mouse, Touch, Keyboard)
   ---------------------------------------------------------------------------- */
const Input = {
    keys: {}, joyX: 0, joyY: 0, jump: false,

    init: () => {
        window.addEventListener('keydown', e => Input.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', e => Input.keys[e.key.toLowerCase()] = false);
        
        const cvs = Renderer.canvas;
        if (!cvs) return;
        
        cvs.addEventListener('mousedown', Input.onDown);
        window.addEventListener('mousemove', Input.onMove);
        window.addEventListener('mouseup', Input.onUp);
        
        cvs.addEventListener('touchstart', e => Input.onDown(e.touches[0]), {passive: false});
        window.addEventListener('touchmove', e => Input.onMove(e.touches[0]), {passive: false});
        window.addEventListener('touchend', Input.onUp);

        // Mobile Virtual Joystick
        const joyBase = document.getElementById('joystick');
        const knob = document.getElementById('knob');
        if (joyBase && knob) {
            const handleJoy = (e) => {
                e.preventDefault();
                const rect = joyBase.getBoundingClientRect();
                let dx = e.touches[0].clientX - rect.left - rect.width/2;
                let dy = e.touches[0].clientY - rect.top - rect.height/2;
                const dist = Math.min(Math.sqrt(dx*dx + dy*dy), rect.width/2 - 10);
                const angle = Math.atan2(dy, dx);
                Input.joyX = Math.cos(angle) * dist; 
                Input.joyY = Math.sin(angle) * dist;
                knob.style.transform = `translate(${Input.joyX}px, ${Input.joyY}px)`;
            };
            joyBase.addEventListener('touchstart', handleJoy, {passive: false});
            joyBase.addEventListener('touchmove', handleJoy, {passive: false});
            joyBase.addEventListener('touchend', () => { Input.joyX = 0; Input.joyY = 0; knob.style.transform = 'translate(0px, 0px)'; });
        }

        const jumpBtn = document.getElementById('jump-btn');
        if (jumpBtn) {
            jumpBtn.addEventListener('touchstart', e => { e.preventDefault(); Input.jump = true; });
            jumpBtn.addEventListener('touchend', e => { e.preventDefault(); Input.jump = false; });
        }
        
        // Chat
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.addEventListener('keypress', e => { if (e.key === 'Enter') Network.sendChat(); });
        }
    },

    onDown: (e) => {
        if (e.target !== Renderer.canvas) return; // UI 이벤트 격리

        const rect = Renderer.canvas.getBoundingClientRect();
        const worldX = e.clientX - rect.left + AppState.engine.camera.x;
        const worldY = e.clientY - rect.top + AppState.engine.camera.y;

        if (AppState.engine.mode === 'edit') {
            // Raycast (Z-index 역순 검사)
            let hitPart = null;
            for (let i = AppState.workspace.parts.length - 1; i >= 0; i--) {
                let b = AppState.workspace.parts[i];
                if (worldX >= b.pos.x && worldX <= b.pos.x + b.size.x &&
                    worldY >= b.pos.y && worldY <= b.pos.y + b.size.y) {
                    hitPart = b; break;
                }
            }

            const tool = AppState.editor.activeTool;
            if (tool === 'select' || tool === 'move') {
                EditorCore.selectPart(hitPart ? hitPart.id : null);
                if (hitPart && tool === 'move') {
                    AppState.editor.isDragging = true;
                    AppState.editor.dragOffset = new Vector2(hitPart.pos.x - worldX, hitPart.pos.y - worldY);
                }
            }
        } 
        else if (AppState.engine.mode === 'play') {
            // 인게임 화폐 클릭 시스템
            AppState.workspace.parts.forEach(b => {
                if (b.type === 'clicker' && 
                    worldX >= b.pos.x && worldX <= b.pos.x + b.size.x &&
                    worldY >= b.pos.y && worldY <= b.pos.y + b.size.y) {
                    
                    AppState.user.andBalance += 1;
                    EditorGUI.saveData();
                    document.getElementById('and-balance').innerText = `${AppState.user.andBalance} AND`;
                    EditorGUI.spawnParticle(e.clientX, e.clientY, '+1 AND');
                }
            });
        }
    },

    onMove: (e) => {
        // 카메라 패닝 (우클릭 드래그)
        if (AppState.engine.mode === 'edit' && e.buttons === 2) {
            AppState.engine.camera.x -= e.movementX;
            AppState.engine.camera.y -= e.movementY;
        }

        // 객체 이동 (스냅 적용)
        if (AppState.engine.mode === 'edit' && AppState.editor.isDragging && AppState.editor.selectedPartId) {
            const p = AppState.workspace.parts.find(part => part.id === AppState.editor.selectedPartId);
            if (!p) return;

            const rect = Renderer.canvas.getBoundingClientRect();
            const worldX = e.clientX - rect.left + AppState.engine.camera.x;
            const worldY = e.clientY - rect.top + AppState.engine.camera.y;
            
            const targetX = worldX + AppState.editor.dragOffset.x;
            const targetY = worldY + AppState.editor.dragOffset.y;
            
            p.pos.x = Math.floor(targetX / AppState.engine.gridSnap) * AppState.engine.gridSnap;
            p.pos.y = Math.floor(targetY / AppState.engine.gridSnap) * AppState.engine.gridSnap;
            
            EditorGUI.syncInspector();
        }
    },

    onUp: () => { AppState.editor.isDragging = false; }
};

/* ----------------------------------------------------------------------------
   [10] NETWORK ENGINE (PeerJS)
   ---------------------------------------------------------------------------- */
const Network = {
    peer: null, connections: [],
    
    init: () => {
        if (Network.peer) return;
        Network.peer = new Peer(AppState.user.peerId);
        Network.peer.on('connection', conn => {
            Network.connections.push(conn);
            Network.setupConn(conn);
            Logger.info(`Player joined: ${conn.peer.substring(0,5)}`);
        });
    },
    setupConn: (conn) => {
        conn.on('data', data => {
            if (data.type === 'chat') {
                const box = document.getElementById('chat-messages');
                box.innerHTML += `<div class="msg"><span class="author">${data.id.substring(0,5)}:</span> ${data.msg}</div>`;
                box.scrollTop = box.scrollHeight;
            }
            if (data.type === 'move') Physics.otherPlayers[data.id] = data.pos;
        });
        conn.on('close', () => {
            delete Physics.otherPlayers[conn.peer];
            Logger.warn(`Player left: ${conn.peer.substring(0,5)}`);
        });
    },
    joinGame: (hostId) => {
        if (hostId && hostId !== AppState.user.peerId) {
            const conn = Network.peer.connect(hostId);
            conn.on('open', () => {
                Network.connections.push(conn);
                Network.setupConn(conn);
            });
        }
    },
    sendChat: () => {
        const input = document.getElementById('chat-input');
        const msg = input.value.trim();
        if (!msg) return;
        
        const box = document.getElementById('chat-messages');
        box.innerHTML += `<div class="msg mine"><span class="author">Me:</span> ${msg}</div>`;
        box.scrollTop = box.scrollHeight;
        
        Network.broadcast({ type: 'chat', id: AppState.user.peerId, msg: msg });
        input.value = '';
    },
    broadcast: (data) => {
        Network.connections.forEach(conn => { if (conn.open) conn.send(data); });
    }
};

/* ----------------------------------------------------------------------------
   [11] MAIN APPLICATION CONTROLLER
   ---------------------------------------------------------------------------- */
const GameApp = {
    boot: () => {
        Logger.info('Initializing Engine Core v3.0...');
        EditorGUI.init();
        Renderer.init();
        Input.init();
        
        requestAnimationFrame(GameApp.loop);
        Logger.info('Engine Boot Complete. Welcome to CreateVerse Studio.');
    },
    
    loop: (timestamp) => {
        Time.update(timestamp);
        Physics.update(Time.deltaTime);
        Renderer.draw();
        requestAnimationFrame(GameApp.loop);
    },

    testPlay: () => {
        if (AppState.engine.mode === 'play') return;
        
        Logger.info('Compiling scripts... Starting Local Server...');
        AppState.engine.mode = 'play';
        EditorCore.selectPart(null);
        document.getElementById('play-ui').classList.remove('hidden');
        
        GameApp.respawn();
        Network.init();
        Network.joinGame(AppState.user.peerId); // Local loopback
        EditorGUI.showToast('Test Play Started');
    },

    stopPlay: () => {
        Logger.warn('Shutting down Local Server...');
        AppState.engine.mode = 'edit';
        document.getElementById('play-ui').classList.add('hidden');
        
        // Reset unanchored parts (Snapshot rollback simulation)
        AppState.workspace.parts.forEach(b => {
            if (!b.anchored) b.velocity = new Vector2(0,0);
        });
        EditorGUI.showToast('Returned to Edit Mode');
    },

    respawn: () => {
        const spawn = AppState.workspace.parts.find(b => b.type === 'spawn');
        Physics.player.pos = spawn ? new Vector2(spawn.pos.x, spawn.pos.y - 60) : new Vector2(0, -200);
        Physics.player.vel = new Vector2(0, 0);
        Physics.player.grounded = false;
        EditorGUI.spawnParticle(Physics.player.pos.x, Physics.player.pos.y, 'Respawned', '#4caf50');
    }
};

// Start the engine
window.addEventListener('DOMContentLoaded', GameApp.boot);
