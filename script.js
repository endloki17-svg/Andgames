/**
 * ============================================================================
 * CreateVerse Pro - Ultimate Engine Core v5.5
 * Architecture: Entity-Component-System (ECS) Inspired, OOP, Modular
 * Features: 2D Physics, Raycasting, 2-Way DOM Binding, PeerJS Multiplayer
 * ============================================================================
 */

/* ----------------------------------------------------------------------------
   [1] CORE MATH & UTILITIES (물리 및 그래픽 연산 코어)
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
}

const Utils = {
    generateUUID: () => 'cv_obj_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
    clamp: (val, min, max) => Math.max(min, Math.min(max, val)),
    lerp: (start, end, amt) => (1 - amt) * start + amt * end,
    checkAABB: (r1, r2) => {
        return r1.pos.x < r2.pos.x + r2.size.x && r1.pos.x + r1.size.x > r2.pos.x &&
               r1.pos.y < r2.pos.y + r2.size.y && r1.pos.y + r1.size.y > r2.pos.y;
    }
};

/* ----------------------------------------------------------------------------
   [2] SYSTEM LOGGER & TIME MANAGER (아웃풋 콘솔 및 프레임 제어)
   ---------------------------------------------------------------------------- */
const Time = {
    deltaTime: 0, lastTime: 0, frameCount: 0, fps: 0,
    update: (now) => {
        Time.deltaTime = (now - Time.lastTime) / 1000;
        Time.lastTime = now;
        Time.frameCount++;
        if (Time.frameCount % 10 === 0) {
            Time.fps = Math.round(1 / Time.deltaTime);
            // 에디터/플레이 화면 FPS UI 업데이트
            document.querySelectorAll('#fps-display').forEach(el => el.innerText = `${Time.fps} FPS`);
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

        const logHtml = `<div class="log-line ${type}"><span class="log-time">${timeStr}</span> ${icon} ${msg}</div>`;
        consoleEl.insertAdjacentHTML('beforeend', logHtml);
        consoleEl.scrollTop = consoleEl.scrollHeight;
    },
    info: (m) => Logger.log(m, 'info'),
    warn: (m) => Logger.log(m, 'warning'),
    error: (m) => Logger.log(m, 'error'),
    clear: () => { const el = document.getElementById('console-logs'); if(el) el.innerHTML = ''; }
};

/* ----------------------------------------------------------------------------
   [3] GAME OBJECT MODEL (엔티티 시스템)
   ---------------------------------------------------------------------------- */
class Block {
    constructor(config) {
        this.id = config.id || Utils.generateUUID();
        this.name = config.name || 'Part';
        this.type = config.type || 'normal'; // normal, bounce, lava, clicker, spawn
        
        // Transform
        this.pos = new Vector2(config.x || 0, config.y || 0);
        this.size = new Vector2(config.w || 50, config.h || 50);
        
        // Appearance
        this.color = config.color || '#a5b4fc';
        this.alpha = config.alpha !== undefined ? config.alpha : 0.0; // 0=불투명 (Roblox 방식)
        
        // Physics
        this.anchored = config.anchored !== undefined ? config.anchored : true;
        this.canCollide = config.canCollide !== undefined ? config.canCollide : true;
        this.velocity = new Vector2(0, 0);
    }
}

/* ----------------------------------------------------------------------------
   [4] GLOBAL STATE MANAGEMENT (로컬 스토리지 DB)
   ---------------------------------------------------------------------------- */
const STORAGE_KEY = 'CreateVerse_Ultimate_DB';

const AppState = {
    isEditorMode: false, // 현재 열린 HTML이 editor.html인지 여부
    user: {
        peerId: Utils.generateUUID(),
        andBalance: 150,
        purchased: [],
        lastDailyReward: null
    },
    games: [], // 로비에 표시되는 월드 목록
    currentWorld: null, // 에디터에서 로드된 월드
    engine: {
        mode: 'edit', // 'edit' | 'play'
        camera: new Vector2(0, 0),
        gridSnap: 25,
        gravity: 1500
    },
    editor: {
        activeTool: 'select',
        selectedObjId: null,
        isDragging: false,
        dragOffset: new Vector2(0, 0)
    }
};

/* ----------------------------------------------------------------------------
   [5] ECONOMY & LOBBY SYSTEM (ATM, 로비 UI 제어)
   ---------------------------------------------------------------------------- */
const Economy = {
    claimDailyReward: () => {
        const today = new Date().toDateString();
        if (AppState.user.lastDailyReward === today) {
            UI.showToast('오늘은 이미 보상을 받았습니다!', true);
            return;
        }
        AppState.user.andBalance += 100;
        AppState.user.lastDailyReward = today;
        DataManager.save();
        UI.updateBalanceUI();
        UI.showToast('출석 보상 +100 AND 지급 완료!');
        UI.spawnParticle(window.innerWidth/2, window.innerHeight/2, '+100 AND', '#4caf50');
    },
    redeemPromo: () => {
        const code = document.getElementById('promo-code').value.toUpperCase();
        if (code === 'WELCOME2026') {
            AppState.user.andBalance += 500;
            document.getElementById('promo-code').value = '';
            DataManager.save();
            UI.updateBalanceUI();
            UI.showToast('프로모션 코드 적용 성공! +500 AND');
        } else {
            UI.showToast('유효하지 않거나 만료된 코드입니다.', true);
        }
    }
};

const LobbyUI = {
    renderGames: () => {
        const list = document.getElementById('game-list');
        const trendingList = document.getElementById('trending-game-list');
        if (!list) return;
        
        list.innerHTML = '';
        if(trendingList) trendingList.innerHTML = '';

        AppState.games.forEach((game, index) => {
            const isMine = game.creator === AppState.user.peerId;
            const isOwned = game.passPrice === 0 || AppState.user.purchased.includes(game.id) || isMine;
            
            // 로비에서 스튜디오 열기
            const editBtn = isMine ? `<button class="btn btn-outline pop w-100" onclick="GameApp.openEditor('${game.id}')"><i class="fa-solid fa-pen-ruler"></i> 스튜디오 열기</button>` : '';
            const playBtn = isOwned ? 
                `<button class="btn btn-success pop w-100 mt-1" onclick="GameApp.playFromLobby('${game.id}')"><i class="fa-solid fa-play"></i> 플레이</button>` :
                `<button class="btn btn-warning pop w-100 mt-1" onclick="GameApp.buyPass('${game.id}', ${game.passPrice})"><i class="fa-solid fa-lock"></i> ${game.passPrice} AND 구매</button>`;

            const html = `
                <div class="game-card">
                    <div class="card-icon">${game.icon}</div>
                    <div class="card-title">${game.name}</div>
                    <div class="card-desc">${game.desc}</div>
                    <div class="card-actions" style="flex-direction:column; gap:4px;">
                        ${editBtn}
                        ${playBtn}
                    </div>
                </div>`;
            
            list.innerHTML += html;
            // 트렌딩에는 앞의 3개만 복사
            if(trendingList && index < 3) trendingList.innerHTML += html;
        });
    }
};

/* ----------------------------------------------------------------------------
   [6] EDITOR UI BINDING (Explorer & Inspector 2-Way Sync)
   ---------------------------------------------------------------------------- */
const EditorUI = {
    syncExplorer: () => {
        const container = document.getElementById('workspace-children');
        if (!container) return;
        container.innerHTML = '';
        
        // 카메라 및 지형 등 하드코딩된 부분 유지, 파트들만 추가
        container.innerHTML += `<div class="tree-node"><i class="fa-solid fa-video node-icon text-muted"></i> Camera</div>`;
        container.innerHTML += `<div class="tree-node"><i class="fa-solid fa-mountain node-icon text-success"></i> Terrain</div>`;

        AppState.currentWorld.blocks.forEach(p => {
            const isSelected = AppState.editor.selectedObjId === p.id;
            const node = document.createElement('div');
            node.className = `tree-node ${isSelected ? 'selected' : ''}`;
            
            let icon = 'fa-cube text-main';
            if (p.type === 'spawn') icon = 'fa-flag text-gold';
            if (p.type === 'lava') icon = 'fa-fire text-danger';
            if (p.type === 'bounce') icon = 'fa-angles-up text-success';
            if (p.type === 'clicker') icon = 'fa-sack-dollar text-gold';
            
            node.innerHTML = `<i class="fa-solid ${icon} node-icon"></i> ${p.name}`;
            node.onclick = () => EditorCore.selectBlock(p.id);
            container.appendChild(node);
        });
    },

    syncInspector: () => {
        const p = AppState.currentWorld?.blocks.find(b => b.id === AppState.editor.selectedObjId);
        const emptyState = document.getElementById('prop-empty');
        const contentState = document.getElementById('prop-content');
        const targetName = document.getElementById('prop-target-name');
        const typeDisplay = document.getElementById('prop-type-display');

        if (!p || !contentState) {
            if(emptyState) emptyState.classList.remove('hidden');
            if(contentState) contentState.classList.add('hidden');
            if(targetName) targetName.innerText = 'Workspace';
            return;
        }

        emptyState.classList.add('hidden');
        contentState.classList.remove('hidden');
        targetName.innerText = p.name;
        if(typeDisplay) typeDisplay.innerText = p.type.toUpperCase();

        // 수십 개의 프로퍼티 DOM에 데이터 바인딩
        const safeSet = (id, val) => { const el = document.getElementById(id); if(el) el.value = val; };
        const safeCheck = (id, val) => { const el = document.getElementById(id); if(el) el.checked = val; };

        safeSet('prop-name', p.name);
        safeSet('prop-type', p.type);
        safeSet('prop-color', p.color !== 'transparent' ? p.color : '#ffffff');
        safeSet('prop-alpha', p.alpha);
        safeSet('prop-x', Math.round(p.pos.x));
        safeSet('prop-y', Math.round(p.pos.y));
        safeSet('prop-w', Math.round(p.size.x));
        safeSet('prop-h', Math.round(p.size.y));
        safeCheck('prop-anchored', p.anchored);
        safeCheck('prop-collide', p.canCollide);
        
        // 리본 메뉴 색상 뷰어 동기화
        const ribbonColor = document.getElementById('ribbon-color-preview');
        if(ribbonColor) ribbonColor.style.background = p.color;
    }
};

const EditorCore = {
    setTool: (tool) => {
        AppState.editor.activeTool = tool;
        document.querySelectorAll('.r-btn-large').forEach(b => b.classList.remove('active'));
        const btn = document.getElementById('tool-' + tool);
        if(btn) btn.classList.add('active');
        Logger.info(`Activated Tool: ${tool}`);
    },

    selectBlock: (id) => {
        AppState.editor.selectedObjId = id;
        EditorUI.syncExplorer();
        EditorUI.syncInspector();
    },

    insertPart: (type) => {
        if(!AppState.currentWorld) return;
        const cam = AppState.engine.camera;
        const colors = { normal: '#5c6bc0', bounce: '#4caf50', lava: '#ef4444', clicker: '#fbbf24', spawn: 'transparent' };
        
        const newBlock = new Block({
            type: type,
            name: type.charAt(0).toUpperCase() + type.slice(1) + 'Part',
            x: Math.floor(cam.x / AppState.engine.gridSnap) * AppState.engine.gridSnap,
            y: Math.floor(cam.y / AppState.engine.gridSnap) * AppState.engine.gridSnap,
            w: type === 'clicker' ? 100 : 50,
            h: type === 'clicker' ? 100 : 50,
            color: colors[type] || '#fff',
            canCollide: type !== 'spawn'
        });
        
        AppState.currentWorld.blocks.push(newBlock);
        EditorCore.selectBlock(newBlock.id);
        EditorCore.setTool('move');
        Logger.info(`Inserted ${type} into Workspace.`);
    },

    deleteSelected: () => {
        if (!AppState.editor.selectedObjId) return;
        AppState.currentWorld.blocks = AppState.currentWorld.blocks.filter(p => p.id !== AppState.editor.selectedObjId);
        Logger.warn('Object deleted.');
        EditorCore.selectBlock(null);
    },

    updateProp: (key) => {
        const p = AppState.currentWorld?.blocks.find(part => part.id === AppState.editor.selectedObjId);
        if (!p) return;
        
        try {
            const getVal = (id) => document.getElementById(id).value;
            const getCheck = (id) => document.getElementById(id).checked;

            if (key === 'x') p.pos.x = parseFloat(getVal('prop-x'));
            if (key === 'y') p.pos.y = parseFloat(getVal('prop-y'));
            if (key === 'w') p.size.x = Math.max(5, parseFloat(getVal('prop-w')));
            if (key === 'h') p.size.y = Math.max(5, parseFloat(getVal('prop-h')));
            if (key === 'color') p.color = getVal('prop-color');
            if (key === 'alpha') p.alpha = parseFloat(getVal('prop-alpha'));
            if (key === 'type') {
                p.type = getVal('prop-type');
                p.name = p.type + 'Part';
                document.getElementById('prop-name').value = p.name;
            }
            if (key === 'anchored') p.anchored = getCheck('prop-anchored');
            if (key === 'canCollide') p.canCollide = getCheck('prop-collide');

            EditorUI.syncExplorer();
            
            // 리본 컬러 동기화
            const ribbonColor = document.getElementById('ribbon-color-preview');
            if(ribbonColor && key === 'color') ribbonColor.style.background = p.color;

        } catch (e) {
            Logger.error('Property Update Failed: ' + e);
        }
    },
    
    toggleAnchor: () => { const p = AppState.currentWorld?.blocks.find(b => b.id === AppState.editor.selectedObjId); if(p){ p.anchored = !p.anchored; EditorUI.syncInspector(); Logger.info('Toggled Anchor'); } },
    toggleCollide: () => { const p = AppState.currentWorld?.blocks.find(b => b.id === AppState.editor.selectedObjId); if(p){ p.canCollide = !p.canCollide; EditorUI.syncInspector(); Logger.info('Toggled Collision'); } }
};

/* ----------------------------------------------------------------------------
   [7] PHYSICS ENGINE (Delta-Time 플랫포머 엔진)
   ---------------------------------------------------------------------------- */
const Physics = {
    player: { pos: new Vector2(0,0), size: new Vector2(35, 35), vel: new Vector2(0,0), grounded: false },
    otherPlayers: {},

    update: (dt) => {
        if (AppState.engine.mode !== 'play' || !AppState.currentWorld) return;

        const p = Physics.player;
        const blocks = AppState.currentWorld.blocks;
        const moveSpeed = 400; // pixels per second
        const jumpForce = -650;

        // X축 처리
        let targetVx = 0;
        if (Input.keys['a'] || Input.joyX < -20) targetVx = -moveSpeed;
        else if (Input.keys['d'] || Input.joyX > 20) targetVx = moveSpeed;
        p.vel.x = Utils.lerp(p.vel.x, targetVx, 1 - Math.pow(0.8, dt * 60)); // 관성 마찰

        // Y축 처리 (점프 및 중력)
        if ((Input.keys['w'] || Input.keys[' '] || Input.jump) && p.grounded) {
            p.vel.y = jumpForce;
            p.grounded = false;
        }
        p.vel.y += AppState.engine.gravity * dt;

        // X축 충돌
        p.pos.x += p.vel.x * dt;
        blocks.forEach(b => {
            if (b.canCollide && Utils.checkAABB(p, b)) {
                if (p.vel.x > 0) p.pos.x = b.pos.x - p.size.x;
                else if (p.vel.x < 0) p.pos.x = b.pos.x + b.size.x;
                p.vel.x = 0;
            }
        });

        // Y축 충돌
        p.pos.y += p.vel.y * dt;
        p.grounded = false;
        blocks.forEach(b => {
            if (Utils.checkAABB(p, b)) {
                // 트리거 블록 (용암 데스)
                if (b.type === 'lava') {
                    Logger.warn('Player fell into Lava!');
                    GameApp.respawnPlayer();
                    return;
                }
            }

            // 솔리드 충돌
            if (b.canCollide && Utils.checkAABB(p, b)) {
                if (p.vel.y > 0) { // 바닥
                    p.pos.y = b.pos.y - p.size.y;
                    p.grounded = true;
                    if (b.type === 'bounce') p.vel.y = jumpForce * 1.6; // 바운스
                    else p.vel.y = 0;
                } 
                else if (p.vel.y < 0) { // 천장
                    p.pos.y = b.pos.y + b.size.y;
                    p.vel.y = 0;
                }
            }
        });

        // 언앵커 파트 물리 추락
        blocks.forEach(b => {
            if (!b.anchored) {
                b.velocity.y += AppState.engine.gravity * dt;
                b.pos.y += b.velocity.y * dt;
            }
        });

        // 카메라 러핑 (Lerp Tracking)
        const targetCamX = p.pos.x - window.innerWidth / 2;
        const targetCamY = p.pos.y - window.innerHeight / 2;
        AppState.engine.camera.x = Utils.lerp(AppState.engine.camera.x, targetCamX, 5 * dt);
        AppState.engine.camera.y = Utils.lerp(AppState.engine.camera.y, targetCamY, 5 * dt);

        // 네트워크 브로드캐스트
        if (Math.random() < 0.15) {
            Network.broadcast({ type: 'move', id: AppState.user.peerId, pos: p.pos });
        }
    }
};

/* ----------------------------------------------------------------------------
   [8] RENDERER (캔버스 파이프라인)
   ---------------------------------------------------------------------------- */
const Renderer = {
    canvas: document.getElementById('game-canvas'),
    ctx: null, loopId: null,

    init: () => {
        if (!Renderer.canvas) return;
        Renderer.ctx = Renderer.canvas.getContext('2d', { alpha: false });
        window.addEventListener('resize', Renderer.resize);
        Renderer.resize();
    },

    resize: () => {
        if (!Renderer.canvas) return;
        const parent = Renderer.canvas.parentElement;
        Renderer.canvas.width = parent.clientWidth;
        Renderer.canvas.height = parent.clientHeight;
    },

    start: () => {
        if (Renderer.loopId) cancelAnimationFrame(Renderer.loopId);
        const loop = (timestamp) => {
            Time.update(timestamp);
            Physics.update(Time.deltaTime);
            Renderer.draw();
            Renderer.loopId = requestAnimationFrame(loop);
        };
        loop(performance.now());
    },

    stop: () => {
        if (Renderer.loopId) cancelAnimationFrame(Renderer.loopId);
        Renderer.loopId = null;
    },

    draw: () => {
        if (!AppState.currentWorld || !Renderer.ctx) return;
        const ctx = Renderer.ctx;
        const cam = AppState.engine.camera;

        // 배경 처리 (에디터는 다크, 플레이는 스카이박스)
        ctx.fillStyle = AppState.engine.mode === 'edit' ? '#141722' : '#87CEEB';
        ctx.fillRect(0, 0, Renderer.canvas.width, Renderer.canvas.height);
        
        ctx.save();
        ctx.translate(Math.floor(-cam.x), Math.floor(-cam.y));

        // 에디터 그리드
        if (AppState.engine.mode === 'edit') {
            ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
            const grid = AppState.engine.gridSnap;
            const startX = Math.floor(cam.x / grid) * grid;
            const startY = Math.floor(cam.y / grid) * grid;
            ctx.beginPath();
            for(let x = startX; x < startX + Renderer.canvas.width + grid; x += grid) { ctx.moveTo(x, cam.y); ctx.lineTo(x, cam.y + Renderer.canvas.height); }
            for(let y = startY; y < startY + Renderer.canvas.height + grid; y += grid) { ctx.moveTo(cam.x, y); ctx.lineTo(cam.x + Renderer.canvas.width, y); }
            ctx.stroke();
        }

        // 블록(Part) 렌더링
        AppState.currentWorld.blocks.forEach(b => {
            const alpha = 1.0 - b.alpha;
            if (alpha <= 0) return;
            
            ctx.globalAlpha = alpha;
            ctx.fillStyle = b.color;

            if (b.type === 'spawn') {
                ctx.strokeStyle = '#f59e0b'; ctx.setLineDash([5, 5]); ctx.lineWidth = 2;
                ctx.strokeRect(b.pos.x, b.pos.y, b.size.x, b.size.y); ctx.setLineDash([]);
            } 
            else if (b.type === 'clicker') {
                ctx.fillRect(b.pos.x, b.pos.y, b.size.x, b.size.y);
                ctx.fillStyle = '#000'; ctx.font = 'bold 24px Pretendard'; ctx.textAlign = 'center';
                ctx.fillText('$', b.pos.x + b.size.x/2, b.pos.y + b.size.y/2 + 8);
            }
            else {
                ctx.fillRect(b.pos.x, b.pos.y, b.size.x, b.size.y);
                if (alpha === 1) {
                    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1;
                    ctx.strokeRect(b.pos.x, b.pos.y, b.size.x, b.size.y);
                    // 엔진 특유의 베벨 하이라이트
                    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
                    ctx.beginPath(); ctx.moveTo(b.pos.x, b.pos.y + b.size.y); ctx.lineTo(b.pos.x, b.pos.y); ctx.lineTo(b.pos.x + b.size.x, b.pos.y); ctx.stroke();
                }
            }
            ctx.globalAlpha = 1.0;

            // 에디터 선택 기즈모
            if (AppState.engine.mode === 'edit' && AppState.editor.selectedObjId === b.id) {
                ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2;
                ctx.strokeRect(b.pos.x - 1, b.pos.y - 1, b.size.x + 2, b.size.y + 2);
                
                ctx.fillStyle = '#fff'; ctx.strokeStyle = '#3b82f6';
                const hs = 6;
                const corners = [{x:b.pos.x,y:b.pos.y}, {x:b.pos.x+b.size.x,y:b.pos.y}, {x:b.pos.x,y:b.pos.y+b.size.y}, {x:b.pos.x+b.size.x,y:b.pos.y+b.size.y}];
                corners.forEach(c => { ctx.fillRect(c.x-hs/2, c.y-hs/2, hs, hs); ctx.strokeRect(c.x-hs/2, c.y-hs/2, hs, hs); });
            }
        });

        // 플레이어 렌더링
        if (AppState.engine.mode === 'play') {
            ctx.textAlign = 'center'; ctx.font = '10px Pretendard';
            ctx.fillStyle = '#ef4444'; // 타인
            for (let id in Physics.otherPlayers) {
                let p = Physics.otherPlayers[id];
                ctx.fillRect(p.x, p.y, Physics.player.size.x, Physics.player.size.y);
                ctx.fillText(id.substring(0,5), p.x + Physics.player.size.x/2, p.y - 5);
            }
            
            const lp = Physics.player; // 본인
            ctx.fillStyle = '#6366f1';
            ctx.fillRect(lp.pos.x, lp.pos.y, lp.size.x, lp.size.y);
            ctx.fillStyle = '#fff';
            ctx.fillText('Me', lp.pos.x + lp.size.x/2, lp.pos.y - 5);
        }
        ctx.restore();
        
        // HUD 좌표 업데이트
        const coordDisplay = document.getElementById('editor-coords');
        if (coordDisplay) coordDisplay.innerText = `X: ${Math.round(cam.x)}, Y: ${Math.round(cam.y)}`;
    }
};

/* ----------------------------------------------------------------------------
   [9] INPUT SYSTEM (이벤트 겹침 방지 레이캐스트)
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

        // 모바일 조이스틱
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
                Input.joyX = Math.cos(angle) * dist; Input.joyY = Math.sin(angle) * dist;
                knob.style.transform = `translate(${Input.joyX}px, ${Input.joyY}px)`;
            };
            joyBase.addEventListener('touchstart', handleJoy, {passive: false});
            joyBase.addEventListener('touchmove', handleJoy, {passive: false});
            joyBase.addEventListener('touchend', () => { Input.joyX = 0; Input.joyY = 0; knob.style.transform = 'translate(0px,0px)'; });
        }

        const jumpBtn = document.getElementById('jump-btn');
        if (jumpBtn) {
            jumpBtn.addEventListener('touchstart', e => { e.preventDefault(); Input.jump = true; });
            jumpBtn.addEventListener('touchend', e => { e.preventDefault(); Input.jump = false; });
        }
        
        const chatInput = document.getElementById('chat-input');
        if (chatInput) chatInput.addEventListener('keypress', e => { if (e.key === 'Enter') Network.sendChat(); });
    },

    onDown: (e) => {
        if (e.target !== Renderer.canvas || !AppState.currentWorld) return; // UI 뚫림 원천 차단

        const rect = Renderer.canvas.getBoundingClientRect();
        const worldX = e.clientX - rect.left + AppState.engine.camera.x;
        const worldY = e.clientY - rect.top + AppState.engine.camera.y;

        if (AppState.engine.mode === 'edit') {
            // Z-Index 역순 레이캐스팅 (가장 위에 있는 블록 선택)
            let hitPart = null;
            for (let i = AppState.currentWorld.blocks.length - 1; i >= 0; i--) {
                let b = AppState.currentWorld.blocks[i];
                if (worldX >= b.pos.x && worldX <= b.pos.x + b.size.x && worldY >= b.pos.y && worldY <= b.pos.y + b.size.y) {
                    hitPart = b; break;
                }
            }

            const tool = AppState.editor.activeTool;
            if (tool === 'select' || tool === 'move') {
                EditorCore.selectBlock(hitPart ? hitPart.id : null);
                if (hitPart && tool === 'move') {
                    AppState.editor.isDragging = true;
                    AppState.editor.dragOffset = new Vector2(hitPart.pos.x - worldX, hitPart.pos.y - worldY);
                }
            }
        } 
        else if (AppState.engine.mode === 'play') {
            // 인게임 화폐 박스 클릭 (Economy 연동)
            AppState.currentWorld.blocks.forEach(b => {
                if (b.type === 'clicker' && worldX >= b.pos.x && worldX <= b.pos.x + b.size.x && worldY >= b.pos.y && worldY <= b.pos.y + b.size.y) {
                    AppState.user.andBalance += 1;
                    DataManager.save();
                    UI.updateBalanceUI();
                    UI.spawnParticle(e.clientX, e.clientY, '+1 AND');
                }
            });
        }
    },

    onMove: (e) => {
        if (AppState.engine.mode === 'edit' && e.buttons === 2) { // 우클릭 카메라 이동
            AppState.engine.camera.x -= e.movementX;
            AppState.engine.camera.y -= e.movementY;
        }

        if (AppState.engine.mode === 'edit' && AppState.editor.isDragging && AppState.editor.selectedObjId) {
            const p = AppState.currentWorld.blocks.find(b => b.id === AppState.editor.selectedObjId);
            if (!p) return;
            const rect = Renderer.canvas.getBoundingClientRect();
            const worldX = e.clientX - rect.left + AppState.engine.camera.x;
            const worldY = e.clientY - rect.top + AppState.engine.camera.y;
            
            p.pos.x = Math.floor((worldX + AppState.editor.dragOffset.x) / 25) * 25;
            p.pos.y = Math.floor((worldY + AppState.editor.dragOffset.y) / 25) * 25;
            EditorUI.syncInspector();
        }
    },
    onUp: () => { AppState.editor.isDragging = false; }
};

/* ----------------------------------------------------------------------------
   [10] NETWORK & MULTIPLAYER (PeerJS)
   ---------------------------------------------------------------------------- */
const Network = {
    peer: null, connections: [],
    init: () => {
        if (Network.peer) return;
        Network.peer = new Peer(AppState.user.peerId);
        Network.peer.on('connection', conn => {
            Network.connections.push(conn);
            Network.setupConn(conn);
            Network.updatePlayerList();
        });
        Logger.info('PeerJS Network Node Started.');
    },
    setupConn: (conn) => {
        conn.on('data', data => {
            if (data.type === 'chat') {
                const box = document.getElementById('chat-messages');
                if(box) { box.innerHTML += `<div class="msg"><span class="author">${data.id.substring(0,5)}:</span> ${data.msg}</div>`; box.scrollTop = box.scrollHeight; }
            }
            if (data.type === 'move') Physics.otherPlayers[data.id] = data.pos;
        });
        conn.on('close', () => { delete Physics.otherPlayers[conn.peer]; Network.updatePlayerList(); });
    },
    joinGame: (hostId) => {
        if (hostId && hostId !== AppState.user.peerId) {
            const conn = Network.peer.connect(hostId);
            conn.on('open', () => { Network.connections.push(conn); Network.setupConn(conn); Network.updatePlayerList(); });
        } else {
            Network.updatePlayerList();
        }
    },
    sendChat: () => {
        const input = document.getElementById('chat-input');
        if (!input || !input.value.trim()) return;
        const box = document.getElementById('chat-messages');
        box.innerHTML += `<div class="msg mine"><span class="author">Me:</span> ${input.value}</div>`;
        box.scrollTop = box.scrollHeight;
        Network.broadcast({ type: 'chat', id: AppState.user.peerId, msg: input.value });
        input.value = '';
    },
    broadcast: (data) => Network.connections.forEach(conn => { if (conn.open) conn.send(data); }),
    updatePlayerList: () => {
        const list = document.getElementById('player-list');
        if(!list) return;
        list.innerHTML = `<li><i class="fa-solid fa-user text-success"></i> Me (Host)</li>`;
        Network.connections.forEach(c => { if(c.open) list.innerHTML += `<li><i class="fa-solid fa-user text-muted"></i> ${c.peer.substring(0,5)}</li>`; });
    }
};

/* ----------------------------------------------------------------------------
   [11] DATA MANAGER & GLOBAL UI UTILS
   ---------------------------------------------------------------------------- */
const DataManager = {
    load: () => {
        const d = localStorage.getItem(STORAGE_KEY);
        if(d) {
            const parsed = JSON.parse(d);
            AppState.user = parsed.user || AppState.user;
            AppState.games = parsed.games || [];
        }
        // 에디터 모드 판별 (HTML 요소 기준)
        AppState.isEditorMode = document.getElementById('editor-wrapper') !== null;
    },
    save: () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: AppState.user, games: AppState.games }));
    }
};

const UI = {
    updateBalanceUI: () => {
        document.querySelectorAll('#and-balance, #atm-balance-display').forEach(el => el.innerText = AppState.user.andBalance);
        const estimate = document.getElementById('atm-krw-estimate');
        if(estimate) estimate.innerText = (AppState.user.andBalance * 10).toLocaleString(); // 1 AND = 10원 가치로 환산
    },
    showModal: (id) => document.getElementById(id)?.classList.remove('hidden'),
    hideModal: (id) => document.getElementById(id)?.classList.add('hidden'),
    showPublishModal: () => UI.showModal('modal-publish'),
    hidePublishModal: () => UI.hideModal('modal-publish'),
    showATMModal: () => { UI.updateBalanceUI(); UI.showModal('modal-atm'); },
    hideATMModal: () => UI.hideModal('modal-atm'),
    
    showToast: (msg, isErr=false) => {
        const c = document.getElementById('toast-container');
        if(!c) return;
        const t = document.createElement('div');
        t.className = 'toast';
        t.innerHTML = `<i class="fa-solid ${isErr?'fa-triangle-exclamation text-danger':'fa-check text-success'}"></i> ${msg}`;
        c.appendChild(t); setTimeout(()=>t.remove(),3000);
    },
    spawnParticle: (x, y, text, color='#fbbf24') => {
        const c = document.getElementById('particle-container');
        if(!c) return;
        const el = document.createElement('div');
        el.className = 'floating-coin-text'; el.innerText = text; el.style.color = color;
        el.style.left = x+'px'; el.style.top = y+'px';
        c.appendChild(el); setTimeout(()=>el.remove(),1000);
    },
    
    // ATM 탭 전환 로직
    initATMTabs: () => {
        document.querySelectorAll('.atm-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.atm-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.atm-tab-content').forEach(c => c.classList.add('hidden'));
                tab.classList.add('active');
                document.getElementById(tab.getAttribute('data-tab'))?.classList.remove('hidden');
            });
        });
    }
};

/* ----------------------------------------------------------------------------
   [12] MAIN APP ROUTER (라이프사이클 오케스트레이터)
   ---------------------------------------------------------------------------- */
const GameApp = {
    boot: () => {
        DataManager.load();
        UI.updateBalanceUI();
        UI.initATMTabs();
        Renderer.init();
        Input.init();

        if (AppState.isEditorMode) {
            // editor.html 일 때 (강제로 첫 번째 게임 또는 새 게임 로드)
            Logger.info('Studio Pro Editor Initialized.');
            if(AppState.games.length === 0) GameApp.createNewGame(true);
            else GameApp.loadWorkspace(AppState.games[0].id);
        } else {
            // index.html 일 때 (로비)
            if(AppState.games.length === 0) {
                // 더미 데이터 주입
                AppState.games.push({
                    id: 'w_demo', name: '점프 마스터즈', desc: '함정을 피하고 목적지까지 도달하세요.',
                    icon: '🚀', passPrice: 0, creator: AppState.user.peerId,
                    blocks: [
                        new Block({ name: 'Baseplate', x:-500, y:200, w:1000, h:50, color:'#1e2233'}),
                        new Block({ name: 'Spawn', x:0, y:150, w:50, h:50, type:'spawn', color:'transparent', canCollide:false}),
                        new Block({ name: 'Lava', x:200, y:180, w:200, h:20, type:'lava', color:'#ef4444'})
                    ]
                });
                DataManager.save();
            }
            LobbyUI.renderGames();
            setTimeout(() => {
                const ls = document.getElementById('screen-loading');
                if(ls) { ls.style.opacity='0'; setTimeout(()=> { ls.classList.add('hidden'); document.getElementById('screen-lobby').classList.remove('hidden'); }, 300); }
            }, 1000);
        }
    },

    createNewGame: (isEditorSkip = false) => {
        const name = document.getElementById('game-name')?.value || '새 프로젝트';
        const desc = document.getElementById('game-desc')?.value || '';
        const price = parseInt(document.getElementById('game-pass-price')?.value) || 0;
        
        const newGame = {
            id: 'world_' + Date.now(),
            name, desc, icon: '🎮', passPrice: price, creator: AppState.user.peerId,
            blocks: [
                new Block({ name: 'Baseplate', x:-1000, y:200, w:2000, h:50, color:'#1e2233'}),
                new Block({ name: 'SpawnLocation', x:0, y:150, w:50, h:50, type:'spawn', color:'transparent', canCollide:false})
            ]
        };
        AppState.games.push(newGame);
        DataManager.save();
        
        if(!isEditorSkip) {
            // 로비에서 스튜디오 진입 (현재는 파일이 분리되어 있으므로 이동)
            window.location.href = 'editor.html';
        }
    },

    loadWorkspace: (id) => {
        const game = AppState.games.find(g => g.id === id);
        if(!game) return;
        AppState.currentWorld = { ...game, blocks: game.blocks.map(b => new Block(b)) };
        AppState.engine.mode = 'edit';
        EditorUI.syncExplorer();
        Renderer.startLoop();
    },

    playFromLobby: (id) => {
        const game = AppState.games.find(g => g.id === id);
        if(!game) return;
        AppState.currentWorld = { ...game, blocks: game.blocks.map(b => new Block(b)) };
        
        document.getElementById('screen-lobby').classList.add('hidden');
        document.getElementById('screen-play').classList.remove('hidden');
        document.getElementById('play-canvas-container').appendChild(Renderer.canvas);
        Renderer.resize();
        
        AppState.engine.mode = 'play';
        GameApp.respawnPlayer();
        Renderer.startLoop();
        Network.init();
        Network.joinGame(game.creator);
    },

    testPlay: () => {
        if(!AppState.currentWorld || AppState.engine.mode === 'play') return;
        Logger.info('Starting Test Play...');
        
        document.getElementById('editor-canvas-container')?.classList.add('hidden');
        // 에디터 내의 플레이 컨테이너로 이동 (editor.html 전용)
        const playContainer = document.getElementById('play-canvas-container');
        if(playContainer) {
            playContainer.appendChild(Renderer.canvas);
            playContainer.parentElement.classList.remove('hidden');
        }
        
        Renderer.resize();
        AppState.engine.mode = 'play';
        GameApp.respawnPlayer();
        
        Network.init();
        Network.joinGame(AppState.user.peerId); // Local
    },

    stopPlay: () => {
        Logger.warn('Stopping Test Play...');
        AppState.engine.mode = 'edit';
        
        const playScreen = document.getElementById('screen-play');
        if(playScreen) playScreen.classList.add('hidden');
        
        const edContainer = document.getElementById('editor-canvas-container');
        if(edContainer) {
            edContainer.classList.remove('hidden');
            edContainer.appendChild(Renderer.canvas);
        }
        
        Renderer.resize();
        AppState.currentWorld.blocks.forEach(b => { if(!b.anchored) b.velocity = new Vector2(0,0); });
    },

    exitPlay: () => {
        Renderer.stopLoop();
        if(AppState.isEditorMode) {
            GameApp.stopPlay();
            Renderer.startLoop();
        } else {
            document.getElementById('screen-play').classList.add('hidden');
            document.getElementById('screen-lobby').classList.remove('hidden');
        }
    },

    saveAndExit: () => {
        if(AppState.currentWorld) {
            const idx = AppState.games.findIndex(g => g.id === AppState.currentWorld.id);
            if(idx !== -1) {
                AppState.games[idx].blocks = AppState.currentWorld.blocks;
                DataManager.save();
                Logger.info('Project Saved to LocalStorage.');
            }
        }
        window.location.href = 'index.html';
    },

    respawnPlayer: () => {
        const spawn = AppState.currentWorld.blocks.find(b => b.type === 'spawn');
        Physics.player.pos = spawn ? new Vector2(spawn.pos.x, spawn.pos.y - 60) : new Vector2(0, -100);
        Physics.player.vel = new Vector2(0,0);
        Physics.player.grounded = false;
    }
};

window.addEventListener('DOMContentLoaded', GameApp.boot);
// Economy 바인딩
GameApp.claimDailyReward = Economy.claimDailyReward;
GameApp.redeemPromo = Economy.redeemPromo;
