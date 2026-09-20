/**
 * ============================================================================
 * CreateVerse Studio Pro - Ultimate Engine Core v2.5
 * Architecture: OOP-based, Modular Event-Driven System
 * Components: Math, Physics, Renderer, GUI, Network, Editor Workspace
 * ============================================================================
 */

/* =========================================
   [1] Core Math & Utilities
========================================= */
class Vector2 {
    constructor(x = 0, y = 0) { this.x = x; this.y = y; }
    add(v) { return new Vector2(this.x + v.x, this.y + v.y); }
    sub(v) { return new Vector2(this.x - v.x, this.y - v.y); }
    mult(n) { return new Vector2(this.x * n, this.y * n); }
    mag() { return Math.sqrt(this.x * this.x + this.y * this.y); }
    clone() { return new Vector2(this.x, this.y); }
}

const Utils = {
    generateId: () => 'part_' + Math.random().toString(36).substr(2, 9),
    clamp: (val, min, max) => Math.max(min, Math.min(max, val)),
    colorToHex: (color) => color // 확장 가능
};

/* =========================================
   [2] Output Console Logger
========================================= */
const Logger = {
    log: (msg, type = 'info') => {
        const consoleEl = document.getElementById('console-logs');
        if (!consoleEl) return;
        const time = new Date().toISOString().substring(11, 23);
        const logHtml = `<div class="log-line ${type}"><span class="timestamp">${time}</span> - ${msg}</div>`;
        consoleEl.innerHTML += logHtml;
        consoleEl.scrollTop = consoleEl.scrollHeight;
    },
    info: (msg) => Logger.log(msg, 'info'),
    warn: (msg) => Logger.log(msg, 'warning'),
    error: (msg) => Logger.log(msg, 'error'),
    clear: () => { document.getElementById('console-logs').innerHTML = ''; }
};

/* =========================================
   [3] Game Objects (Classes)
========================================= */
class BasePart {
    constructor(config) {
        this.id = config.id || Utils.generateId();
        this.name = config.name || 'Part';
        this.type = config.type || 'normal';
        this.pos = new Vector2(config.x || 0, config.y || 0);
        this.size = new Vector2(config.w || 50, config.h || 50);
        this.color = config.color || '#a5b4fc';
        this.alpha = config.alpha !== undefined ? config.alpha : 1.0;
        
        // Physics Properties
        this.anchored = config.anchored !== undefined ? config.anchored : true;
        this.canCollide = config.canCollide !== undefined ? config.canCollide : true;
        this.velocity = new Vector2(0, 0);
    }
}

/* =========================================
   [4] Global Data & State Management
========================================= */
const STORAGE_KEY = 'CreateVerse_Pro_Data';
const AppState = {
    userData: { and: 0, peerId: Utils.generateId(), games: [] },
    workspace: {
        blocks: [],
        spawnPoint: new Vector2(0, 0)
    },
    engine: {
        mode: 'edit', // 'edit' | 'play'
        camera: new Vector2(0, 0),
        zoom: 1.0,
        gridSize: 50
    },
    editor: {
        selectedPart: null,
        activeTool: 'select', // select, move, scale, draw, erase
        isDragging: false,
        dragOffset: new Vector2(0, 0)
    }
};

/* Data Initialization */
function initData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            AppState.userData = JSON.parse(saved);
            Logger.info('User data loaded from LocalStorage.');
        } else {
            AppState.userData.games.push(createDefaultWorld());
            saveData();
            Logger.info('New user profile created.');
        }
        document.getElementById('and-balance').innerText = `${AppState.userData.and} AND`;
    } catch (e) {
        Logger.error('Failed to load data: ' + e.message);
    }
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(AppState.userData));
    document.getElementById('and-balance').innerText = `${AppState.userData.and} AND`;
}

function createDefaultWorld() {
    return {
        id: 'world_default_1',
        name: 'My First Baseplate',
        desc: '로블록스 스튜디오 스타일의 기본 맵입니다.',
        icon: '🌍',
        passPrice: 0,
        creator: AppState.userData.peerId,
        blocks: [
            new BasePart({ name: 'Baseplate', x: -500, y: 150, w: 1000, h: 50, color: '#1e293b', anchored: true }),
            new BasePart({ name: 'SpawnLocation', x: 0, y: 100, w: 50, h: 50, type: 'spawn', color: 'transparent', anchored: true, canCollide: false }),
            new BasePart({ name: 'CoinBox', x: 200, y: -50, w: 100, h: 100, type: 'clicker', color: '#ffb300', anchored: true })
        ]
    };
}

/* =========================================
   [5] Explorer & Inspector (UI Binding)
========================================= */
const GUI = {
    syncExplorer: () => {
        const container = document.getElementById('workspace-children');
        if (!container) return;
        container.innerHTML = '';
        
        AppState.workspace.blocks.forEach(part => {
            const isSelected = AppState.editor.selectedPart && AppState.editor.selectedPart.id === part.id;
            const node = document.createElement('div');
            node.className = `tree-node ${isSelected ? 'selected' : ''}`;
            
            // 타입별 아이콘 분기
            let icon = 'fa-cube text-main';
            if(part.type === 'spawn') icon = 'fa-flag text-gold';
            if(part.type === 'lava') icon = 'fa-fire text-danger';
            if(part.type === 'bounce') icon = 'fa-angles-up text-success';
            if(part.type === 'clicker') icon = 'fa-sack-dollar text-gold';
            
            node.innerHTML = `<i class="fa-solid ${icon} node-icon"></i> <span class="node-name">${part.name}</span>`;
            node.onclick = () => Editor.selectPart(part.id);
            container.appendChild(node);
        });
    },

    syncInspector: () => {
        const part = AppState.editor.selectedPart;
        const emptyState = document.getElementById('prop-empty-state');
        const contentState = document.getElementById('prop-content');
        const targetName = document.getElementById('prop-target-name');

        if (!part) {
            emptyState.classList.remove('hidden');
            contentState.classList.add('hidden');
            targetName.innerText = 'None';
            return;
        }

        emptyState.classList.add('hidden');
        contentState.classList.remove('hidden');
        targetName.innerText = part.name;

        // 양방향 데이터 바인딩 (DOM 업데이트)
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
        if(!container) return;
        const t = document.createElement('div');
        t.className = 'toast';
        t.innerHTML = `<i class="fa-solid ${isError ? 'fa-triangle-exclamation text-danger' : 'fa-check text-success'}"></i> ${msg}`;
        container.appendChild(t);
        setTimeout(() => t.remove(), 3000);
    }
};

/* =========================================
   [6] Editor Actions (Logic)
========================================= */
const Editor = {
    setTool: (tool) => {
        AppState.editor.activeTool = tool;
        document.querySelectorAll('.r-btn, .tool-btn').forEach(b => b.classList.remove('active'));
        const btn1 = document.getElementById('tool-' + tool);
        if(btn1) btn1.classList.add('active');
        Logger.info(`Tool changed to: ${tool.toUpperCase()}`);
    },

    selectPart: (id) => {
        const part = AppState.workspace.blocks.find(b => b.id === id);
        AppState.editor.selectedPart = part || null;
        GUI.syncExplorer();
        GUI.syncInspector();
    },

    insertPart: (type) => {
        const cam = AppState.engine.camera;
        // 화면 중앙(카메라 위치 근처)에 스폰
        const newPart = new BasePart({
            type: type,
            name: type.charAt(0).toUpperCase() + type.slice(1) + 'Part',
            x: Math.floor(cam.x / 50) * 50,
            y: Math.floor(cam.y / 50) * 50,
            w: type === 'clicker' ? 100 : 50,
            h: type === 'clicker' ? 100 : 50,
            color: Editor.getDefaultColor(type),
            anchored: true,
            canCollide: type !== 'spawn'
        });
        
        AppState.workspace.blocks.push(newPart);
        Editor.selectPart(newPart.id);
        Editor.setTool('move');
        Logger.info(`Inserted new ${type} part into Workspace.`);
    },

    deleteSelected: () => {
        if (!AppState.editor.selectedPart) return;
        AppState.workspace.blocks = AppState.workspace.blocks.filter(b => b.id !== AppState.editor.selectedPart.id);
        Logger.warn(`Deleted part: ${AppState.editor.selectedPart.name}`);
        Editor.selectPart(null);
    },

    updateProp: (key) => {
        const p = AppState.editor.selectedPart;
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
                p.name = p.type + 'Part'; // 이름 자동 변경
            }
            
            if (key === 'anchored') p.anchored = document.getElementById('prop-anchored').checked;
            if (key === 'canCollide') p.canCollide = document.getElementById('prop-collide').checked;

            GUI.syncExplorer();
        } catch (e) {
            Logger.error('Property update error: ' + e);
        }
    },

    toggleAnchor: () => {
        if(AppState.editor.selectedPart) {
            AppState.editor.selectedPart.anchored = !AppState.editor.selectedPart.anchored;
            GUI.syncInspector();
            Logger.info(`Toggled Anchor to ${AppState.editor.selectedPart.anchored}`);
        }
    },

    toggleCollide: () => {
        if(AppState.editor.selectedPart) {
            AppState.editor.selectedPart.canCollide = !AppState.editor.selectedPart.canCollide;
            GUI.syncInspector();
        }
    },

    getDefaultColor: (type) => {
        const colors = { normal: '#5c6bc0', bounce: '#4caf50', lava: '#f44336', clicker: '#ffb300', spawn: 'transparent' };
        return colors[type] || '#ffffff';
    }
};

/* =========================================
   [7] Physics Engine & Player Controller
========================================= */
const Physics = {
    player: {
        pos: new Vector2(0, 0),
        size: new Vector2(35, 35),
        vel: new Vector2(0, 0),
        grounded: false
    },
    otherPlayers: {},

    update: () => {
        if (AppState.engine.mode !== 'play') return;

        const p = Physics.player;
        const blocks = AppState.workspace.blocks;
        const speed = 7;
        const friction = 0.82;
        const gravity = 0.8;
        const jumpForce = -15;

        // 1. Input Processing
        if (Input.keys['a'] || Input.joyX < -20) p.vel.x = -speed;
        else if (Input.keys['d'] || Input.joyX > 20) p.vel.x = speed;
        else p.vel.x *= friction; // 관성 마찰

        if ((Input.keys['w'] || Input.keys[' '] || Input.jump) && p.grounded) {
            p.vel.y = jumpForce;
            p.grounded = false;
        }

        p.vel.y += gravity;

        // 2. AABB Collision Detection & Resolution (X축 처리)
        p.pos.x += p.vel.x;
        blocks.forEach(b => {
            if (b.canCollide && Physics.checkAABB(p, b)) {
                if (p.vel.x > 0) p.pos.x = b.pos.x - p.size.x;
                else if (p.vel.x < 0) p.pos.x = b.pos.x + b.size.x;
                p.vel.x = 0;
            }
        });

        // 3. AABB Collision (Y축 처리)
        p.pos.y += p.vel.y;
        p.grounded = false;
        blocks.forEach(b => {
            // 트리거(센서) 블록 검사
            if (Physics.checkAABB(p, b)) {
                if (b.type === 'lava') {
                    Logger.warn('Player touched Lava! Respawning...');
                    GameApp.respawn();
                    return;
                }
            }

            // 물리 충돌 처리
            if (b.canCollide && Physics.checkAABB(p, b)) {
                if (p.vel.y > 0) {
                    p.pos.y = b.pos.y - p.size.y;
                    p.grounded = true;
                    // 바운스 블록 로직
                    if (b.type === 'bounce') p.vel.y = -22; 
                    else p.vel.y = 0;
                } else if (p.vel.y < 0) {
                    p.pos.y = b.pos.y + b.size.y;
                    p.vel.y = 0;
                }
            }
        });

        // 4. 언앵커 파트 물리 연산 (간이 추락)
        blocks.forEach(b => {
            if (!b.anchored) {
                b.velocity.y += gravity;
                b.pos.y += b.velocity.y;
            }
        });

        // 5. 카메라 추적 (Lerp interpolation)
        const targetX = p.pos.x - window.innerWidth / 2;
        const targetY = p.pos.y - window.innerHeight / 2;
        AppState.engine.camera.x += (targetX - AppState.engine.camera.x) * 0.1;
        AppState.engine.camera.y += (targetY - AppState.engine.camera.y) * 0.1;

        // 6. Network Sync (초당 약 10회 브로드캐스트)
        if (Math.random() < 0.15) {
            Network.broadcast({ type: 'move', id: AppState.userData.peerId, pos: p.pos });
        }
    },

    checkAABB: (rect1, rect2) => {
        return rect1.pos.x < rect2.pos.x + rect2.size.x &&
               rect1.pos.x + rect1.size.x > rect2.pos.x &&
               rect1.pos.y < rect2.pos.y + rect2.size.y &&
               rect1.pos.y + rect1.size.y > rect2.pos.y;
    }
};

/* =========================================
   [8] Graphics Rendering Pipeline
========================================= */
const Renderer = {
    canvas: document.getElementById('game-canvas'),
    ctx: null,
    loopId: null,

    init: () => {
        if(!Renderer.canvas) return;
        Renderer.ctx = Renderer.canvas.getContext('2d');
        window.addEventListener('resize', Renderer.resize);
        Renderer.resize();
    },

    resize: () => {
        if(!Renderer.canvas) return;
        const parent = Renderer.canvas.parentElement;
        Renderer.canvas.width = parent.clientWidth;
        Renderer.canvas.height = parent.clientHeight;
    },

    loop: () => {
        Physics.update();
        Renderer.draw();
        Renderer.loopId = requestAnimationFrame(Renderer.loop);
    },

    draw: () => {
        const ctx = Renderer.ctx;
        const w = Renderer.canvas.width;
        const h = Renderer.canvas.height;
        const cam = AppState.engine.camera;

        ctx.clearRect(0, 0, w, h);
        ctx.save();
        ctx.translate(-cam.x, -cam.y);

        // 1. Draw Grid (Edit Mode Only)
        if (AppState.engine.mode === 'edit') {
            ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            ctx.lineWidth = 1;
            const grid = AppState.engine.gridSize;
            const startX = Math.floor(cam.x / grid) * grid;
            const startY = Math.floor(cam.y / grid) * grid;
            
            ctx.beginPath();
            for(let x = startX; x < startX + w + grid; x += grid) { ctx.moveTo(x, cam.y); ctx.lineTo(x, cam.y + h); }
            for(let y = startY; y < startY + h + grid; y += grid) { ctx.moveTo(cam.x, y); ctx.lineTo(cam.x + w, y); }
            ctx.stroke();
        }

        // 2. Draw Blocks (Parts)
        AppState.workspace.blocks.forEach(b => {
            ctx.globalAlpha = b.alpha;
            ctx.fillStyle = b.color;

            if (b.type === 'spawn') {
                ctx.strokeStyle = '#f59e0b'; ctx.setLineDash([5, 5]); ctx.lineWidth = 2;
                ctx.strokeRect(b.pos.x, b.pos.y, b.size.x, b.size.y); ctx.setLineDash([]);
                ctx.fillStyle = '#f59e0b'; ctx.font = '10px Arial'; ctx.fillText('SPAWN', b.pos.x + 5, b.pos.y + 15);
            } 
            else if (b.type === 'clicker') {
                ctx.fillRect(b.pos.x, b.pos.y, b.size.x, b.size.y);
                ctx.fillStyle = '#000'; ctx.font = 'bold 24px Pretendard'; ctx.textAlign = 'center';
                ctx.fillText('$', b.pos.x + b.size.x/2, b.pos.y + b.size.y/2 + 8);
                ctx.textAlign = 'left';
            }
            else {
                ctx.fillRect(b.pos.x, b.pos.y, b.size.x, b.size.y);
                if (b.alpha === 1) {
                    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1;
                    ctx.strokeRect(b.pos.x, b.pos.y, b.size.x, b.size.y);
                }
            }
            ctx.globalAlpha = 1.0;

            // Selection Highlight & Resize Handles (Studio Style)
            if (AppState.engine.mode === 'edit' && AppState.editor.selectedPart && AppState.editor.selectedPart.id === b.id) {
                ctx.strokeStyle = '#007acc'; ctx.lineWidth = 2;
                ctx.strokeRect(b.pos.x - 1, b.pos.y - 1, b.size.x + 2, b.size.y + 2);
                
                // Draw 4 corner handles
                ctx.fillStyle = '#fff'; ctx.strokeStyle = '#007acc';
                const hSize = 6;
                const corners = [
                    {x: b.pos.x, y: b.pos.y}, {x: b.pos.x + b.size.x, y: b.pos.y},
                    {x: b.pos.x, y: b.pos.y + b.size.y}, {x: b.pos.x + b.size.x, y: b.pos.y + b.size.y}
                ];
                corners.forEach(c => {
                    ctx.fillRect(c.x - hSize/2, c.y - hSize/2, hSize, hSize);
                    ctx.strokeRect(c.x - hSize/2, c.y - hSize/2, hSize, hSize);
                });
            }
        });

        // 3. Draw Players (Play Mode Only)
        if (AppState.engine.mode === 'play') {
            // Other players
            ctx.fillStyle = '#ef4444';
            for (let id in Physics.otherPlayers) {
                let p = Physics.otherPlayers[id];
                ctx.fillRect(p.x, p.y, Physics.player.size.x, Physics.player.size.y);
                ctx.fillStyle = '#fff'; ctx.font='10px Arial'; ctx.fillText(id.substring(0,5), p.x, p.y - 5);
                ctx.fillStyle = '#ef4444';
            }
            // Local Player
            const lp = Physics.player;
            ctx.fillStyle = '#5c6bc0';
            ctx.shadowColor = '#5c6bc0'; ctx.shadowBlur = 10;
            ctx.fillRect(lp.pos.x, lp.pos.y, lp.size.x, lp.size.y);
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#fff'; ctx.font='10px Arial'; ctx.fillText('Me', lp.pos.x, lp.pos.y - 5);
        }

        ctx.restore();
    }
};

/* =========================================
   [9] Input Management (Keyboard, Mouse, Touch)
========================================= */
const Input = {
    keys: {}, joyX: 0, joyY: 0, jump: false,

    init: () => {
        window.addEventListener('keydown', e => Input.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', e => Input.keys[e.key.toLowerCase()] = false);
        
        const cvs = Renderer.canvas;
        if(!cvs) return;
        
        cvs.addEventListener('mousedown', Input.onDown);
        window.addEventListener('mousemove', Input.onMove);
        window.addEventListener('mouseup', Input.onUp);
        
        cvs.addEventListener('touchstart', e => Input.onDown(e.touches[0]), {passive: false});
        window.addEventListener('touchmove', e => Input.onMove(e.touches[0]), {passive: false});
        window.addEventListener('touchend', Input.onUp);

        // Mobile Controls
        const joyBase = document.getElementById('joystick');
        const knob = document.getElementById('knob');
        if (joyBase && knob) {
            const handleJoy = (e) => {
                e.preventDefault();
                const rect = joyBase.getBoundingClientRect();
                let dx = e.touches[0].clientX - rect.left - 65; // radius
                let dy = e.touches[0].clientY - rect.top - 65;
                const dist = Math.min(Math.sqrt(dx*dx + dy*dy), 40);
                const angle = Math.atan2(dy, dx);
                Input.joyX = Math.cos(angle) * dist; Input.joyY = Math.sin(angle) * dist;
                knob.style.transform = `translate(${Input.joyX}px, ${Input.joyY}px)`;
            };
            joyBase.addEventListener('touchstart', handleJoy, {passive: false});
            joyBase.addEventListener('touchmove', handleJoy, {passive: false});
            joyBase.addEventListener('touchend', () => { Input.joyX = 0; Input.joyY = 0; knob.style.transform = `translate(0px, 0px)`; });
        }

        const jumpBtn = document.getElementById('jump-btn');
        if (jumpBtn) {
            jumpBtn.addEventListener('touchstart', e => { e.preventDefault(); Input.jump = true; });
            jumpBtn.addEventListener('touchend', e => { e.preventDefault(); Input.jump = false; });
        }
        
        // Chat Enter Key
        const chatInput = document.getElementById('chat-input');
        if(chatInput) {
            chatInput.addEventListener('keypress', e => { if (e.key === 'Enter') Network.sendChat(); });
        }
    },

    onDown: (e) => {
        if(e.target !== Renderer.canvas) return; // UI 클릭 무시 방어

        const cam = AppState.engine.camera;
        const worldX = e.clientX - Renderer.canvas.getBoundingClientRect().left + cam.x;
        const worldY = e.clientY - Renderer.canvas.getBoundingClientRect().top + cam.y;

        if (AppState.engine.mode === 'edit') {
            const grid = AppState.engine.gridSize;
            const snapX = Math.floor(worldX / grid) * grid;
            const snapY = Math.floor(worldY / grid) * grid;
            
            // Raycast 판정 (역순으로 그려진 순서 가장 위를 찾음)
            let hitPart = null;
            for (let i = AppState.workspace.blocks.length - 1; i >= 0; i--) {
                let b = AppState.workspace.blocks[i];
                if (worldX >= b.pos.x && worldX <= b.pos.x + b.size.x &&
                    worldY >= b.pos.y && worldY <= b.pos.y + b.size.y) {
                    hitPart = b; break;
                }
            }

            const tool = AppState.editor.activeTool;
            
            if (tool === 'select' || tool === 'move') {
                if (hitPart) {
                    Editor.selectPart(hitPart.id);
                    if (tool === 'move') {
                        AppState.editor.isDragging = true;
                        AppState.editor.dragOffset = new Vector2(hitPart.pos.x - worldX, hitPart.pos.y - worldY);
                    }
                } else {
                    Editor.selectPart(null);
                }
            } 
            else if (tool === 'erase' && hitPart) {
                Editor.selectPart(hitPart.id);
                Editor.deleteSelected();
            }
        } 
        else if (AppState.engine.mode === 'play') {
            // 인게임 클릭커 처리
            AppState.workspace.blocks.forEach(b => {
                if (b.type === 'clicker' && 
                    worldX >= b.pos.x && worldX <= b.pos.x + b.size.x &&
                    worldY >= b.pos.y && worldY <= b.pos.y + b.size.y) {
                    
                    AppState.userData.and += 1; 
                    saveData();
                    GUI.showToast('+1 AND 획득!');
                    GUI.spawnParticle(e.clientX, e.clientY, '+1 AND', '#ffb300');
                }
            });
        }
    },

    onMove: (e) => {
        // 에디터 카메라 이동 (우클릭 드래그)
        if (AppState.engine.mode === 'edit' && e.buttons === 2) {
            AppState.engine.camera.x -= e.movementX;
            AppState.engine.camera.y -= e.movementY;
        }

        // 객체 드래그 이동
        if (AppState.engine.mode === 'edit' && AppState.editor.isDragging && AppState.editor.selectedPart) {
            const cam = AppState.engine.camera;
            const worldX = e.clientX - Renderer.canvas.getBoundingClientRect().left + cam.x;
            const worldY = e.clientY - Renderer.canvas.getBoundingClientRect().top + cam.y;
            
            const grid = AppState.engine.gridSize / 2; // 스냅 해상도 높임 (25px)
            const targetX = worldX + AppState.editor.dragOffset.x;
            const targetY = worldY + AppState.editor.dragOffset.y;
            
            AppState.editor.selectedPart.pos.x = Math.floor(targetX / grid) * grid;
            AppState.editor.selectedPart.pos.y = Math.floor(targetY / grid) * grid;
            
            GUI.syncInspector(); // 실시간 좌표 업데이트
        }
    },

    onUp: () => { AppState.editor.isDragging = false; }
};

/* =========================================
   [10] Network Engine (PeerJS Multiplayer)
========================================= */
const Network = {
    peer: null, connections: [],
    
    init: () => {
        if (Network.peer) return;
        try {
            Network.peer = new Peer(AppState.userData.peerId);
            Network.peer.on('connection', conn => {
                Network.connections.push(conn);
                Network.setupConn(conn);
                Logger.info(`Player ${conn.peer.substring(0,5)} connected.`);
            });
            Logger.info('Network Engine initialized on port 443.');
        } catch(e) {
            Logger.error('PeerJS init failed: ' + e.message);
        }
    },
    setupConn: (conn) => {
        conn.on('data', data => {
            if (data.type === 'chat') {
                const box = document.getElementById('chat-messages');
                if(box) {
                    box.innerHTML += `<div class="msg"><span class="author">${data.id.substring(0,5)}:</span> ${data.msg}</div>`;
                    box.scrollTop = box.scrollHeight;
                }
            }
            if (data.type === 'move') Physics.otherPlayers[data.id] = data.pos;
        });
        conn.on('close', () => {
            delete Physics.otherPlayers[conn.peer];
            Logger.info(`Player ${conn.peer.substring(0,5)} disconnected.`);
        });
    },
    joinGame: (hostId) => {
        if (hostId && hostId !== AppState.userData.peerId) {
            Logger.info(`Connecting to server: ${hostId}...`);
            const conn = Network.peer.connect(hostId);
            conn.on('open', () => {
                Network.connections.push(conn);
                Network.setupConn(conn);
                Logger.info('Connection established successfully.');
            });
        }
    },
    sendChat: () => {
        const input = document.getElementById('chat-input');
        if(!input) return;
        const msg = input.value.trim();
        if (!msg) return;
        
        const box = document.getElementById('chat-messages');
        box.innerHTML += `<div class="msg mine"><span class="author">Me:</span> ${msg}</div>`;
        box.scrollTop = box.scrollHeight;
        
        Network.broadcast({ type: 'chat', id: AppState.userData.peerId, msg: msg });
        input.value = '';
    },
    broadcast: (data) => {
        Network.connections.forEach(conn => { if (conn.open) conn.send(data); });
    }
};

/* =========================================
   [11] Application Main Controller
========================================= */
const GameApp = {
    boot: () => {
        Logger.info('Booting CreateVerse Engine...');
        initData();
        Renderer.init();
        Input.init();
        
        // Load default workspace
        const defaultGame = AppState.userData.games[0];
        AppState.workspace.blocks = defaultGame.blocks.map(b => new BasePart(b));
        GUI.syncExplorer();
        
        // Start Render Loop
        if(!Renderer.loopId) Renderer.loop();
        Logger.info('Engine Boot Complete. Ready.');
    },
    
    testPlay: () => {
        if (AppState.engine.mode === 'play') return;
        
        Logger.info('Compiling Scripts... Starting Test Play Mode.');
        AppState.engine.mode = 'play';
        document.getElementById('play-ui').classList.remove('hidden');
        
        // Find Spawn
        const spawn = AppState.workspace.blocks.find(b => b.type === 'spawn');
        if (spawn) {
            Physics.player.pos = new Vector2(spawn.pos.x, spawn.pos.y - Physics.player.size.y - 10);
        } else {
            Physics.player.pos = new Vector2(0, -100);
        }
        
        Physics.player.vel = new Vector2(0,0);
        
        Network.init();
        Network.joinGame(AppState.userData.peerId); // Local loopback for demo
    },

    stopPlay: () => {
        Logger.info('Stopping Play Mode... Resetting Physics.');
        AppState.engine.mode = 'edit';
        document.getElementById('play-ui').classList.add('hidden');
        
        // Reset blocks velocity
        AppState.workspace.blocks.forEach(b => {
            if(!b.anchored) {
                b.velocity = new Vector2(0,0);
                // 실 서비스에선 원래 위치(Snapshot)로 롤백해야 하나, 데모에선 생략
            }
        });
    },

    respawn: () => {
        const spawn = AppState.workspace.blocks.find(b => b.type === 'spawn');
        Physics.player.pos = spawn ? new Vector2(spawn.pos.x, spawn.pos.y - 50) : new Vector2(0, -100);
        Physics.player.vel = new Vector2(0,0);
    }
};

// Start the engine when DOM is ready
window.addEventListener('DOMContentLoaded', GameApp.boot);
