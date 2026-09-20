/* =========================================
   1. 코어 데이터 및 로컬스토리지 시스템
========================================= */
const STORAGE_KEY = 'createVerse_studio_v1';
let userData = JSON.parse(localStorage.getItem(STORAGE_KEY));

if (!userData) {
    userData = {
        and: 0,
        purchasedPasses: [],
        games: [],
        peerId: 'user_' + Math.random().toString(36).substr(2, 9)
    };
    
    // 기본 '공식 화폐 벌기' 맵
    userData.games.push({
        id: 'official_map_01',
        name: '공식 튜토리얼 & 화폐 벌기',
        desc: '조작법을 익히고 노란 박스를 클릭해 화폐를 모으세요!',
        icon: '💎',
        passPrice: 0,
        creator: userData.peerId,
        blocks: [
            // 바닥 (Anchored: true, CanCollide: true)
            { id: 1, x: -200, y: 300, w: 1000, h: 50, type: 'normal', color: '#6366f1', anchored: true, canCollide: true },
            // 스폰 포인트
            { id: 2, x: 0, y: 250, w: 50, h: 50, type: 'spawn', color: 'transparent', anchored: true, canCollide: false },
            // 화폐 박스
            { id: 3, x: 200, y: 150, w: 100, h: 100, type: 'clicker', color: '#fbbf24', anchored: true, canCollide: true },
            // 바운스 블록
            { id: 4, x: -100, y: 250, w: 50, h: 50, type: 'bounce', color: '#34d399', anchored: true, canCollide: true },
            // 용암 (데스 블록)
            { id: 5, x: 400, y: 280, w: 150, h: 20, type: 'lava', color: '#f43f5e', anchored: true, canCollide: true }
        ]
    });
    saveData();
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    document.getElementById('and-balance').innerText = userData.and;
}

/* =========================================
   2. UI 및 상호작용 컨트롤러
========================================= */
const UI = {
    init: () => {
        saveData();
        UI.renderGameList();
        setTimeout(() => {
            const loader = document.getElementById('loading-screen');
            loader.style.opacity = '0';
            setTimeout(() => { loader.classList.replace('active', 'hidden'); UI.showScreen('main-menu'); }, 500);
        }, 1500);
    },
    showScreen: (id) => {
        document.querySelectorAll('.screen').forEach(s => { s.classList.remove('active'); s.classList.add('hidden'); });
        document.getElementById(id).classList.remove('hidden');
        document.getElementById(id).classList.add('active');
    },
    showPublishModal: () => document.getElementById('publish-modal').classList.remove('hidden'),
    hidePublishModal: () => {
        document.getElementById('publish-modal').classList.add('hidden');
        document.getElementById('game-name').value = ''; document.getElementById('game-desc').value = '';
    },
    showToast: (msg, type = 'info') => {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast';
        const icon = type === 'error' ? 'fa-triangle-exclamation text-danger' : type === 'success' ? 'fa-check text-success' : 'fa-bell';
        toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${msg}</span>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    },
    renderGameList: () => {
        const list = document.getElementById('game-list');
        list.innerHTML = '';
        userData.games.forEach(game => {
            const isOwned = game.passPrice === 0 || userData.purchasedPasses.includes(game.id) || game.creator === userData.peerId;
            const btnHtml = isOwned ? 
                `<button class="btn btn-success pop" onclick="GameApp.playGame('${game.id}')"><i class="fa-solid fa-play"></i> 플레이</button>` :
                `<button class="btn btn-primary pop" onclick="GameApp.buyPass('${game.id}', ${game.passPrice})"><i class="fa-solid fa-lock"></i> ${game.passPrice} and</button>`;
            
            list.innerHTML += `
                <div class="game-card">
                    <div class="card-icon">${game.icon}</div>
                    <div class="card-title">${game.name}</div>
                    <div class="card-desc">${game.desc}</div>
                    <div class="card-actions">
                        <button class="icon-btn" onclick="GameApp.editGame('${game.id}')"><i class="fa-solid fa-hammer"></i></button>
                        ${btnHtml}
                    </div>
                </div>
            `;
        });
    },
    spawnParticle: (x, y, text, color = 'var(--gold)') => {
        const container = document.getElementById('particle-container');
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

/* =========================================
   3. 스튜디오 에디터 코어 (Properties & Tools)
========================================= */
const Editor = {
    currentTool: 'select', // select, draw, erase
    currentAsset: 'normal',
    selectedBlock: null,
    dragOffset: { x: 0, y: 0 },
    isDragging: false,
    
    setTool: (tool) => {
        Editor.currentTool = tool;
        document.querySelectorAll('.studio-leftbar .tool-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('tool-' + tool).classList.add('active');
        if (tool !== 'select') Editor.deselect();
    },
    setAsset: (asset) => {
        Editor.currentAsset = asset;
        document.querySelectorAll('.asset-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('asset-' + asset).classList.add('active');
        Editor.setTool('draw'); // 에셋 선택 시 자동으로 그리기 툴 전환
    },
    selectBlock: (block) => {
        Editor.selectedBlock = block;
        document.getElementById('no-selection-msg').classList.add('hidden');
        document.getElementById('prop-content').classList.remove('hidden');
        
        // UI에 속성 동기화
        document.getElementById('prop-w').value = block.w;
        document.getElementById('prop-h').value = block.h;
        document.getElementById('prop-color').value = block.color !== 'transparent' ? block.color : '#000000';
        document.getElementById('prop-anchored').checked = block.anchored;
        document.getElementById('prop-collide').checked = block.canCollide;
    },
    deselect: () => {
        Editor.selectedBlock = null;
        document.getElementById('no-selection-msg').classList.remove('hidden');
        document.getElementById('prop-content').classList.add('hidden');
    },
    updateProp: (key) => {
        if (!Editor.selectedBlock) return;
        const b = Editor.selectedBlock;
        if (key === 'w') b.w = Math.max(10, parseInt(document.getElementById('prop-w').value));
        if (key === 'h') b.h = Math.max(10, parseInt(document.getElementById('prop-h').value));
        if (key === 'color') b.color = document.getElementById('prop-color').value;
        if (key === 'anchored') b.anchored = document.getElementById('prop-anchored').checked;
        if (key === 'canCollide') b.canCollide = document.getElementById('prop-collide').checked;
    },
    deleteSelected: () => {
        if (!Editor.selectedBlock) return;
        Engine.gameData.blocks = Engine.gameData.blocks.filter(b => b.id !== Editor.selectedBlock.id);
        Editor.deselect();
        UI.showToast('블록이 삭제되었습니다.');
    },
    getDefaultColor: (type) => {
        const colors = { normal: '#a5b4fc', bounce: '#34d399', lava: '#f43f5e', clicker: '#fbbf24', spawn: 'transparent' };
        return colors[type] || '#ffffff';
    }
};

/* =========================================
   4. 멀티플레이어 네트워크 (PeerJS)
========================================= */
const Network = {
    peer: null, connections: [],
    init: () => {
        if (Network.peer) return;
        Network.peer = new Peer(userData.peerId);
        Network.peer.on('connection', conn => {
            Network.connections.push(conn);
            Network.setupConn(conn);
        });
    },
    setupConn: (conn) => {
        conn.on('data', data => {
            if (data.type === 'chat') {
                const box = document.getElementById('chat-messages');
                box.innerHTML += `<div class="chat-msg"><span class="author">${data.id.substring(0,5)}</span> ${data.msg}</div>`;
                box.scrollTop = box.scrollHeight;
            }
            if (data.type === 'move') Engine.otherPlayers[data.id] = data.pos;
        });
    },
    joinGame: (hostId) => {
        if (hostId && hostId !== userData.peerId) {
            const conn = Network.peer.connect(hostId);
            conn.on('open', () => {
                Network.connections.push(conn);
                Network.setupConn(conn);
                document.getElementById('chat-messages').innerHTML += `<div class="chat-msg system">서버에 연결되었습니다.</div>`;
            });
        }
    },
    sendChat: () => {
        const input = document.getElementById('chat-input');
        const msg = input.value.trim();
        if (!msg) return;
        document.getElementById('chat-messages').innerHTML += `<div class="chat-msg mine"><span class="author">나</span> ${msg}</div>`;
        Network.broadcast({ type: 'chat', id: userData.peerId, msg: msg });
        input.value = '';
    },
    broadcast: (data) => Network.connections.forEach(conn => { if (conn.open) conn.send(data); })
};

/* =========================================
   5. 메인 게임/렌더링 엔진 (물리 처리 포함)
========================================= */
const Engine = {
    canvas: document.getElementById('game-canvas'),
    ctx: null, mode: 'menu', gameData: null, loopId: null,
    camera: { x: 0, y: 0 },
    player: { x: 0, y: 0, w: 35, h: 35, vx: 0, vy: 0, grounded: false, spawnX: 0, spawnY: -100 },
    otherPlayers: {},

    init: () => {
        Engine.ctx = Engine.canvas.getContext('2d');
        window.addEventListener('resize', Engine.resize);
        Engine.resize();
    },
    resize: () => { Engine.canvas.width = window.innerWidth; Engine.canvas.height = window.innerHeight; },
    
    start: (game, mode) => {
        Engine.gameData = game;
        Engine.mode = mode;
        Engine.otherPlayers = {};
        Editor.deselect();
        
        // 스폰 포인트 찾기
        const spawnBlock = game.blocks.find(b => b.type === 'spawn');
        if (spawnBlock) {
            Engine.player.spawnX = spawnBlock.x + (spawnBlock.w/2) - (Engine.player.w/2);
            Engine.player.spawnY = spawnBlock.y - Engine.player.h - 10;
        }
        
        Engine.player.x = Engine.player.spawnX;
        Engine.player.y = Engine.player.spawnY;
        Engine.player.vx = 0; Engine.player.vy = 0;
        
        // 카메라 초기 위치 세팅
        Engine.camera.x = Engine.player.x - window.innerWidth / 2;
        Engine.camera.y = Engine.player.y - window.innerHeight / 2;

        UI.showScreen('game-screen');
        document.getElementById('editor-ui').classList.toggle('hidden', mode !== 'edit');
        document.getElementById('play-ui').classList.toggle('hidden', mode !== 'play');
        
        if (mode === 'play') { Network.init(); Network.joinGame(game.creator); }
        if (Engine.loopId) cancelAnimationFrame(Engine.loopId);
        Engine.loop();
    },
    
    respawn: () => {
        Engine.player.x = Engine.player.spawnX;
        Engine.player.y = Engine.player.spawnY;
        Engine.player.vx = 0; Engine.player.vy = 0;
        UI.spawnParticle(Engine.player.x, Engine.player.y, '부활!', 'var(--primary)');
    },

    loop: () => {
        Engine.update();
        Engine.draw();
        Engine.loopId = requestAnimationFrame(Engine.loop);
    },

    update: () => {
        if (Engine.mode === 'play') {
            // [물리] 1. 플레이어 입력 및 마찰력
            const speed = 7;
            const friction = 0.8;
            if (Input.keys['a'] || Input.joyX < -20) Engine.player.vx = -speed;
            else if (Input.keys['d'] || Input.joyX > 20) Engine.player.vx = speed;
            else Engine.player.vx *= friction;

            // [물리] 2. 점프 및 중력
            if ((Input.keys['w'] || Input.keys[' '] || Input.jump) && Engine.player.grounded) {
                Engine.player.vy = -14;
                Engine.player.grounded = false;
            }
            Engine.player.vy += 0.7; // 중력 가속도

            // [물리] 3. 충돌 처리 (X, Y 분리 처리로 미끄러짐 구현)
            Engine.player.x += Engine.player.vx;
            Engine.gameData.blocks.forEach(b => {
                if (b.canCollide && Engine.checkCollision(Engine.player, b)) {
                    if (Engine.player.vx > 0) Engine.player.x = b.x - Engine.player.w;
                    else if (Engine.player.vx < 0) Engine.player.x = b.x + b.w;
                }
            });

            Engine.player.y += Engine.player.vy;
            Engine.player.grounded = false;
            Engine.gameData.blocks.forEach(b => {
                // 특수 블록 판정 (CanCollide 여부 상관없이 위치 겹침 확인)
                if (Engine.checkCollision(Engine.player, b)) {
                    if (b.type === 'lava') { Engine.respawn(); return; }
                }

                // 물리 충돌
                if (b.canCollide && Engine.checkCollision(Engine.player, b)) {
                    if (Engine.player.vy > 0) { // 떨어질 때 바닥 충돌
                        Engine.player.grounded = true;
                        Engine.player.y = b.y - Engine.player.h;
                        
                        if (b.type === 'bounce') Engine.player.vy = -20; // 슈퍼 점프
                        else Engine.player.vy = 0;
                        
                    } else if (Engine.player.vy < 0) { // 올라갈 때 천장 충돌
                        Engine.player.y = b.y + b.h;
                        Engine.player.vy = 0;
                    }
                }
            });

            // [물리] 4. 언앵커(Anchored=false) 블록 중력 적용
            Engine.gameData.blocks.forEach(b => {
                if (!b.anchored) b.y += 5; // 단순한 추락 로직 (퍼포먼스 고려)
            });

            // 카메라 부드러운 추적 (Lerp)
            Engine.camera.x += ((Engine.player.x - window.innerWidth / 2) - Engine.camera.x) * 0.1;
            Engine.camera.y += ((Engine.player.y - window.innerHeight / 2) - Engine.camera.y) * 0.1;

            if (Math.random() < 0.2) Network.broadcast({ type: 'move', id: userData.peerId, pos: { x: Engine.player.x, y: Engine.player.y } });
        } 
        else if (Engine.mode === 'edit') {
            const panSpeed = 15;
            if (Input.keys['w']) Engine.camera.y -= panSpeed;
            if (Input.keys['s']) Engine.camera.y += panSpeed;
            if (Input.keys['a']) Engine.camera.x -= panSpeed;
            if (Input.keys['d']) Engine.camera.x += panSpeed;
        }
    },

    checkCollision: (r1, r2) => {
        return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x && r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
    },

    draw: () => {
        const ctx = Engine.ctx;
        ctx.clearRect(0, 0, Engine.canvas.width, Engine.canvas.height);
        ctx.save();
        ctx.translate(-Engine.camera.x, -Engine.camera.y);

        // 그리드 (편집 모드)
        if (Engine.mode === 'edit') {
            ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            ctx.lineWidth = 1;
            const grid = 50;
            const startX = Math.floor(Engine.camera.x / grid) * grid;
            const startY = Math.floor(Engine.camera.y / grid) * grid;
            for(let x = startX; x < startX + window.innerWidth + grid; x += grid) { ctx.beginPath(); ctx.moveTo(x, Engine.camera.y); ctx.lineTo(x, Engine.camera.y + window.innerHeight); ctx.stroke(); }
            for(let y = startY; y < startY + window.innerHeight + grid; y += grid) { ctx.beginPath(); ctx.moveTo(Engine.camera.x, y); ctx.lineTo(Engine.camera.x + window.innerWidth, y); ctx.stroke(); }
        }

        // 블록 렌더링
        if (Engine.gameData) {
            Engine.gameData.blocks.forEach(b => {
                ctx.fillStyle = b.color;
                
                // 특수 시각 효과
                if (b.type === 'spawn') {
                    ctx.strokeStyle = '#fbbf24'; ctx.setLineDash([5, 5]); ctx.lineWidth = 2;
                    ctx.strokeRect(b.x, b.y, b.w, b.h); ctx.setLineDash([]);
                    ctx.fillStyle = '#fbbf24'; ctx.font = '12px Arial'; ctx.fillText('SPAWN', b.x + 5, b.y + 20);
                } 
                else if (b.type === 'clicker') {
                    ctx.fillRect(b.x, b.y, b.w, b.h);
                    ctx.fillStyle = '#000'; ctx.font = 'bold 20px Pretendard'; ctx.textAlign = 'center';
                    ctx.fillText('$', b.x + b.w/2, b.y + b.h/2 + 7);
                } 
                else {
                    ctx.globalAlpha = b.canCollide ? 1.0 : 0.4; // CanCollide 꺼지면 반투명
                    ctx.fillRect(b.x, b.y, b.w, b.h);
                    ctx.globalAlpha = 1.0;
                    ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1; ctx.strokeRect(b.x, b.y, b.w, b.h);
                }

                // 선택된 블록 하이라이트 (에디터)
                if (Engine.mode === 'edit' && Editor.selectedBlock && Editor.selectedBlock.id === b.id) {
                    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.setLineDash([8, 4]);
                    ctx.strokeRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4); ctx.setLineDash([]);
                }
            });
        }

        // 플레이어 렌더링 (플레이 모드)
        if (Engine.mode === 'play') {
            ctx.fillStyle = 'rgba(244, 63, 94, 0.8)';
            for (let id in Engine.otherPlayers) {
                let p = Engine.otherPlayers[id];
                ctx.fillRect(p.x, p.y, Engine.player.w, Engine.player.h);
            }
            
            ctx.fillStyle = '#6366f1';
            ctx.shadowColor = '#6366f1'; ctx.shadowBlur = 15;
            ctx.fillRect(Engine.player.x, Engine.player.y, Engine.player.w, Engine.player.h);
            ctx.shadowBlur = 0;
        }
        ctx.restore();
    }
};

/* =========================================
   6. 입력 관리 (마우스, 터치, 키보드)
========================================= */
const Input = {
    keys: {}, joyX: 0, joyY: 0, jump: false,
    
    init: () => {
        window.addEventListener('keydown', e => Input.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', e => Input.keys[e.key.toLowerCase()] = false);
        document.getElementById('chat-input').addEventListener('keypress', e => { if (e.key === 'Enter') Network.sendChat(); });

        // 마우스 및 터치 이벤트 (에디터 & 클릭커)
        const cvs = Engine.canvas;
        cvs.addEventListener('mousedown', Input.onDown);
        cvs.addEventListener('mousemove', Input.onMove);
        window.addEventListener('mouseup', Input.onUp);
        
        cvs.addEventListener('touchstart', e => Input.onDown(e.touches[0]), {passive: false});
        cvs.addEventListener('touchmove', e => Input.onMove(e.touches[0]), {passive: false});
        window.addEventListener('touchend', Input.onUp);

        // 조이스틱
        const joyBase = document.getElementById('joystick');
        const knob = document.getElementById('knob');
        const handleJoy = (e) => {
            e.preventDefault();
            const rect = joyBase.getBoundingClientRect();
            let dx = e.touches[0].clientX - rect.left - 70;
            let dy = e.touches[0].clientY - rect.top - 70;
            const dist = Math.min(Math.sqrt(dx*dx + dy*dy), 40);
            const angle = Math.atan2(dy, dx);
            Input.joyX = Math.cos(angle) * dist; Input.joyY = Math.sin(angle) * dist;
            knob.style.transform = `translate(${Input.joyX}px, ${Input.joyY}px)`;
        };
        joyBase.addEventListener('touchstart', handleJoy, {passive: false});
        joyBase.addEventListener('touchmove', handleJoy, {passive: false});
        joyBase.addEventListener('touchend', () => { Input.joyX = 0; Input.joyY = 0; knob.style.transform = `translate(0px, 0px)`; });

        // 점프 버튼
        const jumpBtn = document.getElementById('jump-btn');
        jumpBtn.addEventListener('touchstart', e => { e.preventDefault(); Input.jump = true; });
        jumpBtn.addEventListener('touchend', e => { e.preventDefault(); Input.jump = false; });
    },
    
    onDown: (e) => {
        const worldX = e.clientX + Engine.camera.x;
        const worldY = e.clientY + Engine.camera.y;

        if (Engine.mode === 'edit') {
            const snapX = Math.floor(worldX / 50) * 50;
            const snapY = Math.floor(worldY / 50) * 50;
            
            // 클릭된 블록 찾기 (역순으로 찾아 맨 위 블록 선택)
            let clickedBlock = null;
            for (let i = Engine.gameData.blocks.length - 1; i >= 0; i--) {
                let b = Engine.gameData.blocks[i];
                if (worldX > b.x && worldX < b.x + b.w && worldY > b.y && worldY < b.y + b.h) {
                    clickedBlock = b; break;
                }
            }

            if (Editor.currentTool === 'select') {
                if (clickedBlock) {
                    Editor.selectBlock(clickedBlock);
                    Editor.isDragging = true;
                    Editor.dragOffset = { x: clickedBlock.x - worldX, y: clickedBlock.y - worldY };
                } else {
                    Editor.deselect();
                }
            } 
            else if (Editor.currentTool === 'erase') {
                if (clickedBlock) {
                    Engine.gameData.blocks = Engine.gameData.blocks.filter(b => b.id !== clickedBlock.id);
                    if (Editor.selectedBlock?.id === clickedBlock.id) Editor.deselect();
                }
            }
            else if (Editor.currentTool === 'draw') {
                // 그리기 (기본 크기 50x50, 화폐함은 100x100)
                const size = Editor.currentAsset === 'clicker' ? 100 : 50;
                const newBlock = {
                    id: Date.now(), x: snapX, y: snapY, w: size, h: size,
                    type: Editor.currentAsset,
                    color: Editor.getDefaultColor(Editor.currentAsset),
                    anchored: true,
                    canCollide: Editor.currentAsset !== 'spawn' // 스폰은 기본적으로 통과
                };
                Engine.gameData.blocks.push(newBlock);
                Editor.selectBlock(newBlock);
            }
        } 
        else if (Engine.mode === 'play') {
            // 화폐 획득 로직
            Engine.gameData.blocks.forEach(b => {
                if (b.type === 'clicker' && worldX > b.x && worldX < b.x + b.w && worldY > b.y && worldY < b.y + b.h) {
                    userData.and += 1; saveData();
                    UI.spawnParticle(e.clientX, e.clientY, '+1 and');
                }
            });
        }
    },
    
    onMove: (e) => {
        if (Engine.mode === 'edit' && Editor.isDragging && Editor.selectedBlock) {
            const worldX = e.clientX + Engine.camera.x;
            const worldY = e.clientY + Engine.camera.y;
            // 25px 단위 스냅 이동 (더 세밀한 조작)
            Editor.selectedBlock.x = Math.floor((worldX + Editor.dragOffset.x) / 25) * 25;
            Editor.selectedBlock.y = Math.floor((worldY + Editor.dragOffset.y) / 25) * 25;
        }
    },
    
    onUp: () => { Editor.isDragging = false; }
};

/* =========================================
   7. 앱 연결 API
========================================= */
const GameApp = {
    createNewGame: () => {
        const newGame = {
            id: 'world_' + Date.now(),
            name: document.getElementById('game-name').value || '새로운 세계',
            desc: document.getElementById('game-desc').value || '설명이 없습니다.',
            icon: document.getElementById('game-icon').value || '🌍',
            passPrice: parseInt(document.getElementById('game-pass-price').value) || 0,
            creator: userData.peerId,
            blocks: [
                { id: 1, x: -300, y: 150, w: 1000, h: 50, type: 'normal', color: '#1e293b', anchored: true, canCollide: true },
                { id: 2, x: 0, y: 100, w: 50, h: 50, type: 'spawn', color: 'transparent', anchored: true, canCollide: false }
            ]
        };
        userData.games.push(newGame); saveData(); UI.hidePublishModal();
        UI.showToast('새 월드가 생성되었습니다.', 'success');
        Engine.start(newGame, 'edit');
    },
    editGame: (id) => { const game = userData.games.find(g => g.id === id); if (game) Engine.start(game, 'edit'); },
    playGame: (id) => { const game = userData.games.find(g => g.id === id); if (game) Engine.start(game, 'play'); },
    testPlay: () => { 
        UI.showToast('테스트 플레이 모드 진입', 'success');
        Engine.start(Engine.gameData, 'play'); 
    },
    buyPass: (id, price) => {
        if (userData.and >= price) {
            userData.and -= price; userData.purchasedPasses.push(id); saveData();
            UI.renderGameList(); UI.showToast('패스 구매 성공!', 'success');
        } else {
            UI.showToast(`and가 부족합니다. (필요: ${price})`, 'error');
        }
    },
    saveAndExit: () => { saveData(); Engine.mode = 'menu'; UI.showScreen('main-menu'); UI.renderGameList(); UI.showToast('저장 완료', 'success'); },
    exitPlay: () => { Engine.mode = 'menu'; UI.showScreen('main-menu'); UI.renderGameList(); }
};

window.onload = () => { Engine.init(); Input.init(); UI.init(); };
