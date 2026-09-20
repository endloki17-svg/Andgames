/**
 * ============================================================================
 * CreateVerse ULTIMATE ENGINE CORE v4.0
 * Architecture: Screen Routing, Isolated Canvas, OOP Physics, PeerJS Network
 * ============================================================================
 */

/* ----------------------------------------------------------------------------
   [1] CORE MATH & UTILITIES
   ---------------------------------------------------------------------------- */
class Vector2 {
    constructor(x = 0, y = 0) { this.x = x; this.y = y; }
    add(v) { return new Vector2(this.x + v.x, this.y + v.y); }
    sub(v) { return new Vector2(this.x - v.x, this.y - v.y); }
    mag() { return Math.sqrt(this.x * this.x + this.y * this.y); }
    clone() { return new Vector2(this.x, this.y); }
}

const Utils = {
    generateId: () => 'cv_' + Math.random().toString(36).substr(2, 9),
    clamp: (val, min, max) => Math.max(min, Math.min(max, val)),
    lerp: (start, end, amt) => (1 - amt) * start + amt * end
};

/* ----------------------------------------------------------------------------
   [2] GAME OBJECT MODEL (블록 클래스)
   ---------------------------------------------------------------------------- */
class Block {
    constructor(config) {
        this.id = config.id || Utils.generateId();
        this.name = config.name || 'Part';
        this.type = config.type || 'normal'; // normal, bounce, lava, clicker, spawn
        
        this.pos = new Vector2(config.x || 0, config.y || 0);
        this.size = new Vector2(config.w || 50, config.h || 50);
        this.color = config.color || '#5c6bc0';
        
        this.anchored = config.anchored !== undefined ? config.anchored : true;
        this.canCollide = config.canCollide !== undefined ? config.canCollide : true;
        this.velocity = new Vector2(0, 0);
    }
}

/* ----------------------------------------------------------------------------
   [3] GLOBAL STATE (앱 전체 상태 관리)
   ---------------------------------------------------------------------------- */
const STORAGE_KEY = 'CreateVerse_Data_v4';

const AppState = {
    user: {
        peerId: Utils.generateId(),
        andBalance: 0,
        purchased: []
    },
    games: [], // 로비에 표시될 월드 목록
    currentWorld: null, // 현재 편집/플레이 중인 월드 데이터
    engine: {
        mode: 'menu', // menu | edit | play
        camera: new Vector2(0, 0),
        gridSize: 50
    },
    editor: {
        activeTool: 'draw', // draw, erase, select
        activeAsset: 'normal',
        selectedBlockId: null,
        isDragging: false,
        dragOffset: new Vector2(0, 0)
    }
};

/* ----------------------------------------------------------------------------
   [4] UI & SCREEN CONTROLLER (화면 전환 및 데이터 바인딩)
   ---------------------------------------------------------------------------- */
const UI = {
    init: () => {
        // 로컬스토리지 데이터 로드
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const data = JSON.parse(saved);
            AppState.user = data.user || AppState.user;
            AppState.games = data.games || [];
        }

        // 기본 튜토리얼 맵이 없으면 생성
        if (AppState.games.length === 0) {
            AppState.games.push({
                id: 'world_tutorial',
                name: '튜토리얼 & 화폐 벌기',
                desc: '조작법을 익히고 화폐 상자를 눌러 AND를 모으세요!',
                icon: '💰',
                passPrice: 0,
                creator: AppState.user.peerId,
                blocks: [
                    new Block({ name: 'Baseplate', x: -500, y: 200, w: 1000, h: 50, color: '#1e2233' }),
                    new Block({ name: 'SpawnPoint', x: 0, y: 150, w: 50, h: 50, type: 'spawn', color: 'transparent', canCollide: false }),
                    new Block({ name: 'CoinBox', x: 200, y: 100, w: 100, h: 100, type: 'clicker', color: '#ffb300' }),
                    new Block({ name: 'BouncePad', x: -200, y: 150, w: 100, h: 50, type: 'bounce', color: '#4caf50' })
                ]
            });
            UI.saveData();
        }

        document.getElementById('and-balance').innerText = AppState.user.andBalance;
        UI.renderLobby();

        // 부드러운 로딩 연출
        setTimeout(() => {
            document.getElementById('screen-loading').style.opacity = '0';
            setTimeout(() => {
                UI.showScreen('screen-lobby');
            }, 300);
        }, 1200);
    },

    saveData: () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            user: AppState.user,
            games: AppState.games
        }));
        document.getElementById('and-balance').innerText = AppState.user.andBalance;
    },

    showScreen: (screenId) => {
        document.querySelectorAll('.app-screen').forEach(s => {
            s.classList.remove('active');
            s.classList.add('hidden');
        });
        const target = document.getElementById(screenId);
        target.classList.remove('hidden');
        // 강제 리플로우 후 클래스 추가하여 애니메이션 발동
        void target.offsetWidth; 
        target.classList.add('active');
    },

    showPublishModal: () => document.getElementById('modal-publish').classList.remove('hidden'),
    hidePublishModal: () => {
        document.getElementById('modal-publish').classList.add('hidden');
        document.getElementById('game-name').value = '';
        document.getElementById('game-desc').value = '';
        document.getElementById('game-pass-price').value = '0';
    },

    renderLobby: () => {
        const list = document.getElementById('game-list');
        list.innerHTML = '';
        AppState.games.forEach(game => {
            const isMine = game.creator === AppState.user.peerId;
            const isOwned = game.passPrice === 0 || AppState.user.purchased.includes(game.id) || isMine;
            
            const btnHtml = isOwned ? 
                `<button class="btn btn-success pop" onclick="GameApp.playGame('${game.id}')"><i class="fa-solid fa-play"></i> 플레이</button>` :
                `<button class="btn btn-primary pop" onclick="GameApp.buyPass('${game.id}', ${game.passPrice})"><i class="fa-solid fa-lock"></i> ${game.passPrice} AND</button>`;
            
            const editBtn = isMine ? `<button class="btn btn-outline pop" onclick="GameApp.editGame('${game.id}')" style="padding: 10px;"><i class="fa-solid fa-pen"></i></button>` : `<div></div>`;

            list.innerHTML += `
                <div class="game-card">
                    <div class="card-icon">${game.icon}</div>
                    <div class="card-title">${game.name}</div>
                    <div class="card-desc">${game.desc}</div>
                    <div class="card-actions">
                        ${editBtn}
                        ${btnHtml}
                    </div>
                </div>
            `;
        });
    },

    syncInspector: () => {
        const p = AppState.currentWorld?.blocks.find(b => b.id === AppState.editor.selectedBlockId);
        const emptyState = document.getElementById('prop-empty');
        const formState = document.getElementById('prop-content');

        if (!p) {
            emptyState.classList.remove('hidden');
            formState.classList.add('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        formState.classList.remove('hidden');

        document.getElementById('prop-w').value = p.size.x;
        document.getElementById('prop-h').value = p.size.y;
        document.getElementById('prop-color').value = p.color !== 'transparent' ? p.color : '#000000';
        document.getElementById('prop-anchored').checked = p.anchored;
        document.getElementById('prop-collide').checked = p.canCollide;
    },

    showToast: (msg) => {
        const c = document.getElementById('toast-container');
        const t = document.createElement('div');
        t.className = 'toast';
        t.innerHTML = `<i class="fa-solid fa-bell text-gold"></i> ${msg}`;
        c.appendChild(t);
        setTimeout(() => t.remove(), 3000);
    },

    spawnParticle: (x, y, text) => {
        const c = document.getElementById('particle-container');
        const el = document.createElement('div');
        el.className = 'floating-coin-text';
        el.innerText = text;
        el.style.left = x + 'px'; el.style.top = y + 'px';
        c.appendChild(el);
        setTimeout(() => el.remove(), 1000);
    }
};

/* ----------------------------------------------------------------------------
   [5] EDITOR LOGIC (도구 및 속성 제어)
   ---------------------------------------------------------------------------- */
const Editor = {
    setTool: (tool) => {
        AppState.editor.activeTool = tool;
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('tool-' + tool)?.classList.add('active');
        if (tool !== 'select') Editor.selectBlock(null);
    },
    
    setAsset: (asset) => {
        AppState.editor.activeAsset = asset;
        document.querySelectorAll('.asset-item').forEach(b => b.classList.remove('active'));
        document.getElementById('asset-' + asset)?.classList.add('active');
        Editor.setTool('draw'); // 에셋 선택 시 자동으로 그리기 툴 전환
    },

    selectBlock: (id) => {
        AppState.editor.selectedBlockId = id;
        UI.syncInspector();
    },

    deleteSelected: () => {
        if (!AppState.editor.selectedBlockId) return;
        AppState.currentWorld.blocks = AppState.currentWorld.blocks.filter(b => b.id !== AppState.editor.selectedBlockId);
        Editor.selectBlock(null);
        UI.showToast('블록이 삭제되었습니다.');
    },

    updateProp: (key) => {
        const p = AppState.currentWorld?.blocks.find(b => b.id === AppState.editor.selectedBlockId);
        if (!p) return;

        if (key === 'w') p.size.x = Math.max(10, parseFloat(document.getElementById('prop-w').value));
        if (key === 'h') p.size.y = Math.max(10, parseFloat(document.getElementById('prop-h').value));
        if (key === 'color') p.color = document.getElementById('prop-color').value;
        if (key === 'anchored') p.anchored = document.getElementById('prop-anchored').checked;
        if (key === 'canCollide') p.canCollide = document.getElementById('prop-collide').checked;
    }
};

/* ----------------------------------------------------------------------------
   [6] PHYSICS ENGINE (플랫포머 물리 충돌)
   ---------------------------------------------------------------------------- */
const Physics = {
    player: { pos: new Vector2(0, 0), size: new Vector2(35, 35), vel: new Vector2(0, 0), grounded: false },
    otherPlayers: {},

    update: () => {
        if (AppState.engine.mode !== 'play' || !AppState.currentWorld) return;

        const p = Physics.player;
        const blocks = AppState.currentWorld.blocks;
        const speed = 7;
        const gravity = 0.8;

        // X축 입력 및 마찰
        if (Input.keys['a'] || Input.joyX < -20) p.vel.x = -speed;
        else if (Input.keys['d'] || Input.joyX > 20) p.vel.x = speed;
        else p.vel.x *= 0.8;

        // 점프
        if ((Input.keys['w'] || Input.keys[' '] || Input.jump) && p.grounded) {
            p.vel.y = -14;
            p.grounded = false;
        }
        p.vel.y += gravity;

        // X축 충돌 처리
        p.pos.x += p.vel.x;
        blocks.forEach(b => {
            if (b.canCollide && Physics.checkAABB(p, b)) {
                if (p.vel.x > 0) p.pos.x = b.pos.x - p.size.x;
                else if (p.vel.x < 0) p.pos.x = b.pos.x + b.size.x;
                p.vel.x = 0;
            }
        });

        // Y축 충돌 처리
        p.pos.y += p.vel.y;
        p.grounded = false;
        
        blocks.forEach(b => {
            // 트리거(데스블록) 처리
            if (Physics.checkAABB(p, b) && b.type === 'lava') {
                GameApp.respawnPlayer();
                return;
            }

            // 물리 충돌
            if (b.canCollide && Physics.checkAABB(p, b)) {
                if (p.vel.y > 0) { // 바닥 착지
                    p.pos.y = b.pos.y - p.size.y;
                    p.grounded = true;
                    p.vel.y = b.type === 'bounce' ? -22 : 0; // 바운스 패드
                } 
                else if (p.vel.y < 0) { // 천장 충돌
                    p.pos.y = b.pos.y + b.size.y;
                    p.vel.y = 0;
                }
            }
        });

        // 언앵커 블록 추락
        blocks.forEach(b => {
            if (!b.anchored) {
                b.velocity.y += gravity;
                b.pos.y += b.velocity.y;
            }
        });

        // 카메라 부드러운 추적
        const targetX = p.pos.x - window.innerWidth / 2;
        const targetY = p.pos.y - window.innerHeight / 2;
        AppState.engine.camera.x += (targetX - AppState.engine.camera.x) * 0.1;
        AppState.engine.camera.y += (targetY - AppState.engine.camera.y) * 0.1;

        // 네트워크 브로드캐스트
        if (Math.random() < 0.2) Network.broadcast({ type: 'move', id: AppState.user.peerId, pos: p.pos });
    },

    checkAABB: (r1, r2) => {
        return r1.pos.x < r2.pos.x + r2.size.x &&
               r1.pos.x + r1.size.x > r2.pos.x &&
               r1.pos.y < r2.pos.y + r2.size.y &&
               r1.pos.y + r1.size.y > r2.pos.y;
    }
};

/* ----------------------------------------------------------------------------
   [7] RENDERER (캔버스 렌더링 파이프라인)
   ---------------------------------------------------------------------------- */
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
        const parent = Renderer.canvas.parentElement;
        Renderer.canvas.width = parent.clientWidth;
        Renderer.canvas.height = parent.clientHeight;
    },

    startLoop: () => {
        if (Renderer.loopId) cancelAnimationFrame(Renderer.loopId);
        const loop = () => {
            Physics.update();
            Renderer.draw();
            Renderer.loopId = requestAnimationFrame(loop);
        };
        loop();
    },

    stopLoop: () => {
        if (Renderer.loopId) cancelAnimationFrame(Renderer.loopId);
        Renderer.loopId = null;
    },

    draw: () => {
        if (!AppState.currentWorld) return;
        
        const ctx = Renderer.ctx;
        const w = Renderer.canvas.width;
        const h = Renderer.canvas.height;
        const cam = AppState.engine.camera;

        ctx.clearRect(0, 0, w, h);
        ctx.save();
        ctx.translate(-cam.x, -cam.y);

        // 1. 그리드 (편집 모드)
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

        // 2. 블록 렌더링
        AppState.currentWorld.blocks.forEach(b => {
            ctx.fillStyle = b.color;
            if (b.type === 'spawn') {
                ctx.strokeStyle = '#fbbf24'; ctx.setLineDash([5, 5]); ctx.strokeRect(b.pos.x, b.pos.y, b.size.x, b.size.y); ctx.setLineDash([]);
                ctx.fillStyle = '#fbbf24'; ctx.font = '10px Arial'; ctx.textAlign = 'center'; ctx.fillText('SPAWN', b.pos.x + b.size.x/2, b.pos.y + b.size.y/2 + 4);
            } 
            else if (b.type === 'clicker') {
                ctx.fillRect(b.pos.x, b.pos.y, b.size.x, b.size.y);
                ctx.fillStyle = '#000'; ctx.font = 'bold 24px Arial'; ctx.textAlign = 'center'; ctx.fillText('$', b.pos.x + b.size.x/2, b.pos.y + b.size.y/2 + 8);
            }
            else {
                ctx.fillRect(b.pos.x, b.pos.y, b.size.x, b.size.y);
                ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.strokeRect(b.pos.x, b.pos.y, b.size.x, b.size.y);
            }

            // 선택된 블록 하이라이트 (에디터)
            if (AppState.engine.mode === 'edit' && AppState.editor.selectedBlockId === b.id) {
                ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 2;
                ctx.strokeRect(b.pos.x - 2, b.pos.y - 2, b.size.x + 4, b.size.y + 4);
            }
        });

        // 3. 플레이어 렌더링 (플레이 모드)
        if (AppState.engine.mode === 'play') {
            // 다른 플레이어
            ctx.fillStyle = '#ef4444';
            ctx.textAlign = 'center'; ctx.font = '10px Arial';
            for (let id in Physics.otherPlayers) {
                let p = Physics.otherPlayers[id];
                ctx.fillRect(p.x, p.y, Physics.player.size.x, Physics.player.size.y);
                ctx.fillText(id.substring(0,5), p.x + Physics.player.size.x/2, p.y - 5);
            }
            // 자신
            const lp = Physics.player;
            ctx.fillStyle = '#10b981';
            ctx.shadowColor = '#10b981'; ctx.shadowBlur = 10;
            ctx.fillRect(lp.pos.x, lp.pos.y, lp.size.x, lp.size.y);
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#fff'; ctx.fillText('Me', lp.pos.x + lp.size.x/2, lp.pos.y - 5);
        }

        ctx.restore();
        
        // 에디터 좌표 표시
        if (AppState.engine.mode === 'edit') {
            const coordDisplay = document.getElementById('coord-display');
            if(coordDisplay) coordDisplay.innerText = `X: ${Math.round(cam.x)}, Y: ${Math.round(cam.y)}`;
        }
    }
};

/* ----------------------------------------------------------------------------
   [8] INPUT SYSTEM (터치, 마우스, 키보드)
   ---------------------------------------------------------------------------- */
const Input = {
    keys: {}, joyX: 0, joyY: 0, jump: false,

    init: () => {
        window.addEventListener('keydown', e => Input.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', e => Input.keys[e.key.toLowerCase()] = false);
        
        const cvs = Renderer.canvas;
        cvs.addEventListener('mousedown', Input.onDown);
        window.addEventListener('mousemove', Input.onMove);
        window.addEventListener('mouseup', Input.onUp);
        
        cvs.addEventListener('touchstart', e => Input.onDown(e.touches[0]), {passive: false});
        window.addEventListener('touchmove', e => Input.onMove(e.touches[0]), {passive: false});
        window.addEventListener('touchend', Input.onUp);

        // 조이스틱
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
        
        // 채팅 엔터
        const chatInput = document.getElementById('chat-input');
        if(chatInput) chatInput.addEventListener('keypress', e => { if (e.key === 'Enter') Network.sendChat(); });
    },

    onDown: (e) => {
        if (e.target !== Renderer.canvas) return; // UI 뚫고 클릭 방어

        const rect = Renderer.canvas.getBoundingClientRect();
        const worldX = e.clientX - rect.left + AppState.engine.camera.x;
        const worldY = e.clientY - rect.top + AppState.engine.camera.y;

        if (AppState.engine.mode === 'edit') {
            const grid = AppState.engine.gridSize;
            const snapX = Math.floor(worldX / grid) * grid;
            const snapY = Math.floor(worldY / grid) * grid;
            
            // Raycast (블록 선택/삭제용)
            let hitPart = null;
            for (let i = AppState.currentWorld.blocks.length - 1; i >= 0; i--) {
                let b = AppState.currentWorld.blocks[i];
                if (worldX >= b.pos.x && worldX <= b.pos.x + b.size.x && worldY >= b.pos.y && worldY <= b.pos.y + b.size.y) {
                    hitPart = b; break;
                }
            }

            const tool = AppState.editor.activeTool;
            
            if (tool === 'select') {
                Editor.selectBlock(hitPart ? hitPart.id : null);
                if (hitPart) {
                    AppState.editor.isDragging = true;
                    AppState.editor.dragOffset = new Vector2(hitPart.pos.x - worldX, hitPart.pos.y - worldY);
                }
            } 
            else if (tool === 'erase' && hitPart) {
                Editor.selectBlock(hitPart.id);
                Editor.deleteSelected();
            }
            else if (tool === 'draw') {
                const asset = AppState.editor.activeAsset;
                const colors = { normal: '#5c6bc0', bounce: '#4caf50', lava: '#ef5350', clicker: '#ffb300', spawn: 'transparent' };
                const newBlock = new Block({
                    type: asset,
                    name: asset.toUpperCase(),
                    x: snapX, y: snapY,
                    w: asset === 'clicker' ? 100 : 50, h: asset === 'clicker' ? 100 : 50,
                    color: colors[asset] || '#fff',
                    canCollide: asset !== 'spawn'
                });
                AppState.currentWorld.blocks.push(newBlock);
                Editor.selectBlock(newBlock.id);
                UI.showToast('블록이 설치되었습니다.');
            }
        } 
        else if (AppState.engine.mode === 'play') {
            // 인게임 화폐 클릭 시스템
            AppState.currentWorld.blocks.forEach(b => {
                if (b.type === 'clicker' && 
                    worldX >= b.pos.x && worldX <= b.pos.x + b.size.x &&
                    worldY >= b.pos.y && worldY <= b.pos.y + b.size.y) {
                    
                    AppState.user.andBalance += 1;
                    UI.saveData();
                    UI.spawnParticle(e.clientX, e.clientY, '+1 AND');
                }
            });
        }
    },

    onMove: (e) => {
        // 카메라 패닝 (WASD가 아닌 마우스 우클릭이나 빈 공간 드래그로 대체)
        if (AppState.engine.mode === 'edit' && e.buttons === 2) {
            AppState.engine.camera.x -= e.movementX;
            AppState.engine.camera.y -= e.movementY;
        }

        // 객체 드래그 이동
        if (AppState.engine.mode === 'edit' && AppState.editor.isDragging && AppState.editor.selectedBlockId) {
            const p = AppState.currentWorld.blocks.find(b => b.id === AppState.editor.selectedBlockId);
            if (!p) return;

            const rect = Renderer.canvas.getBoundingClientRect();
            const worldX = e.clientX - rect.left + AppState.engine.camera.x;
            const worldY = e.clientY - rect.top + AppState.engine.camera.y;
            
            const targetX = worldX + AppState.editor.dragOffset.x;
            const targetY = worldY + AppState.editor.dragOffset.y;
            
            p.pos.x = Math.floor(targetX / 25) * 25; // 25px 스냅 이동
            p.pos.y = Math.floor(targetY / 25) * 25;
            
            UI.syncInspector();
        }
    },

    onUp: () => { AppState.editor.isDragging = false; }
};

/* ----------------------------------------------------------------------------
   [9] NETWORK ENGINE (PeerJS 멀티플레이)
   ---------------------------------------------------------------------------- */
const Network = {
    peer: null, connections: [],
    init: () => {
        if (Network.peer) return;
        Network.peer = new Peer(AppState.user.peerId);
        Network.peer.on('connection', conn => {
            Network.connections.push(conn);
            Network.setupConn(conn);
            UI.showToast('새 플레이어가 접속했습니다.');
            Network.updatePlayerList();
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
            Network.updatePlayerList();
        });
    },
    joinGame: (hostId) => {
        if (hostId && hostId !== AppState.user.peerId) {
            const conn = Network.peer.connect(hostId);
            conn.on('open', () => {
                Network.connections.push(conn);
                Network.setupConn(conn);
                UI.showToast('서버 접속 성공!');
                Network.updatePlayerList();
            });
        } else {
            Network.updatePlayerList(); // 호스트인 경우 자신만 표시
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
    },
    updatePlayerList: () => {
        const list = document.getElementById('player-list');
        if(!list) return;
        list.innerHTML = `<li><i class="fa-solid fa-user text-success"></i> Me (Host)</li>`;
        Network.connections.forEach(conn => {
            if(conn.open) list.innerHTML += `<li><i class="fa-solid fa-user text-muted"></i> ${conn.peer.substring(0,5)}</li>`;
        });
    }
};

/* ----------------------------------------------------------------------------
   [10] MAIN APP CONTROLLER (라이프사이클)
   ---------------------------------------------------------------------------- */
const GameApp = {
    boot: () => {
        UI.init();
        Renderer.init();
        Input.init();
    },

    createNewGame: () => {
        const name = document.getElementById('game-name').value || '새로운 월드';
        const desc = document.getElementById('game-desc').value || '기본 설명입니다.';
        const icon = document.getElementById('game-icon').value || '🌍';
        const price = parseInt(document.getElementById('game-pass-price').value) || 0;
        
        const newGame = {
            id: 'world_' + Date.now(),
            name, desc, icon, passPrice: price,
            creator: AppState.user.peerId,
            blocks: [
                new Block({ name: 'Baseplate', x: -500, y: 200, w: 1000, h: 50, color: '#1e2233' }),
                new Block({ name: 'SpawnPoint', x: 0, y: 150, w: 50, h: 50, type: 'spawn', color: 'transparent', canCollide: false })
            ]
        };
        
        AppState.games.push(newGame);
        UI.saveData();
        UI.hidePublishModal();
        GameApp.editGame(newGame.id);
    },

    editGame: (id) => {
        const game = AppState.games.find(g => g.id === id);
        if (!game) return;
        
        // 원본 데이터를 복사하여 에디터에 로드 (클래스 인스턴스화)
        AppState.currentWorld = { ...game, blocks: game.blocks.map(b => new Block(b)) };
        AppState.engine.mode = 'edit';
        Editor.selectBlock(null);
        
        // 캔버스를 스튜디오 컨테이너로 이동
        document.getElementById('viewport-container').appendChild(Renderer.canvas);
        Renderer.resize();
        
        UI.showScreen('screen-studio');
        Renderer.startLoop();
        UI.showToast('스튜디오 에디터가 열렸습니다.');
    },

    playGame: (id) => {
        const game = AppState.games.find(g => g.id === id);
        if (!game) return;
        
        AppState.currentWorld = { ...game, blocks: game.blocks.map(b => new Block(b)) };
        
        // 캔버스를 플레이 컨테이너로 이동
        document.getElementById('play-viewport-container').appendChild(Renderer.canvas);
        Renderer.resize();

        AppState.engine.mode = 'play';
        UI.showScreen('screen-play');
        
        GameApp.respawnPlayer();
        Renderer.startLoop();
        
        Network.init();
        Network.joinGame(game.creator);
    },

    testPlay: () => {
        if (!AppState.currentWorld) return;
        
        // 캔버스 이동
        document.getElementById('play-viewport-container').appendChild(Renderer.canvas);
        Renderer.resize();
        
        AppState.engine.mode = 'play';
        UI.showScreen('screen-play');
        
        GameApp.respawnPlayer();
        
        Network.init();
        Network.joinGame(AppState.user.peerId); // 로컬 테스트
        UI.showToast('테스트 플레이 시작!');
    },

    exitPlay: () => {
        // 테스트 플레이 중이었다면 스튜디오로, 아니면 로비로
        Renderer.stopLoop();
        if (AppState.currentWorld.creator === AppState.user.peerId) {
            GameApp.editGame(AppState.currentWorld.id); // 스튜디오 복귀
        } else {
            UI.showScreen('screen-lobby'); // 로비 복귀
            UI.renderLobby();
        }
    },

    saveAndExit: () => {
        if (!AppState.currentWorld) return;
        // 수정된 블록 데이터를 원본 게임 배열에 덮어쓰기
        const index = AppState.games.findIndex(g => g.id === AppState.currentWorld.id);
        if (index !== -1) {
            AppState.games[index].blocks = AppState.currentWorld.blocks;
            UI.saveData();
        }
        Renderer.stopLoop();
        UI.showScreen('screen-lobby');
        UI.renderLobby();
        UI.showToast('성공적으로 저장되었습니다.');
    },

    buyPass: (id, price) => {
        if (AppState.user.andBalance >= price) {
            AppState.user.andBalance -= price;
            AppState.user.purchased.push(id);
            UI.saveData();
            UI.renderLobby();
            UI.showToast('패스 구매 성공!');
        } else {
            UI.showToast(`AND가 부족합니다. (현재: ${AppState.user.andBalance})`);
        }
    },

    respawnPlayer: () => {
        const spawn = AppState.currentWorld.blocks.find(b => b.type === 'spawn');
        Physics.player.pos = spawn ? new Vector2(spawn.pos.x, spawn.pos.y - 60) : new Vector2(0, -100);
        Physics.player.vel = new Vector2(0, 0);
        Physics.player.grounded = false;
        UI.spawnParticle(Physics.player.pos.x, Physics.player.pos.y, 'Respawn!');
    }
};

window.addEventListener('DOMContentLoaded', GameApp.boot);
