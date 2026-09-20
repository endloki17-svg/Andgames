/* =========================================
   1. 데이터 및 상태 관리 (LocalStorage)
========================================= */
const STORAGE_KEY = 'createVerse_data_v2';
let userData = JSON.parse(localStorage.getItem(STORAGE_KEY));

// 최초 접속 시 기본 데이터 및 '자동 화폐 벌기' 맵 생성
if (!userData) {
    userData = {
        and: 0,
        purchasedPasses: [],
        games: [],
        peerId: 'user_' + Math.random().toString(36).substr(2, 9) // 고유 유저 ID
    };
    
    // 공식 클릭커 맵 자동 추가
    userData.games.push({
        id: 'official_map_01',
        name: '무한 화폐 벌기 (공식)',
        desc: '노란색 화폐 박스를 터치/클릭하여 and 화폐를 무한으로 모아보세요!',
        icon: '💰',
        passPrice: 0,
        creator: userData.peerId,
        blocks: [
            { x: -200, y: 300, w: 1000, h: 50, type: 'ground' },
            { x: 100, y: 150, w: 100, h: 100, type: 'clicker' }
        ]
    });
    saveData();
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    document.getElementById('and-balance').innerText = userData.and;
}

/* =========================================
   2. UI 및 인터랙션 컨트롤러
========================================= */
const UI = {
    init: () => {
        saveData();
        UI.renderGameList();
        
        // 고급스러운 로딩 스크린 연출 (1.5초 후 메인 메뉴로)
        setTimeout(() => {
            const loader = document.getElementById('loading-screen');
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.classList.replace('active', 'hidden');
                UI.showScreen('main-menu');
            }, 500);
        }, 1500);
    },
    
    showScreen: (id) => {
        document.querySelectorAll('.screen').forEach(s => {
            s.classList.remove('active');
            s.classList.add('hidden');
        });
        document.getElementById(id).classList.remove('hidden');
        document.getElementById(id).classList.add('active');
    },
    
    showPublishModal: () => document.getElementById('publish-modal').classList.remove('hidden'),
    hidePublishModal: () => {
        document.getElementById('publish-modal').classList.add('hidden');
        // 폼 초기화
        document.getElementById('game-name').value = '';
        document.getElementById('game-desc').value = '';
        document.getElementById('game-pass-price').value = '0';
    },
    
    showToast: (msg) => {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<i class="fa-solid fa-bell"></i> ${msg}`;
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
                    <div class="card-info">
                        <div class="card-title">${game.name}</div>
                        <div class="card-desc">${game.desc}</div>
                    </div>
                    <div class="card-actions">
                        <button class="icon-btn" onclick="GameApp.editGame('${game.id}')" title="편집하기"><i class="fa-solid fa-pen-ruler"></i></button>
                        ${btnHtml}
                    </div>
                </div>
            `;
        });
    },

    spawnParticle: (x, y, text) => {
        const container = document.getElementById('particle-container');
        const el = document.createElement('div');
        el.className = 'floating-coin-text';
        el.innerText = text;
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        container.appendChild(el);
        setTimeout(() => el.remove(), 1000);
    }
};

/* =========================================
   3. 실시간 멀티플레이 네트워크 (PeerJS)
========================================= */
const Network = {
    peer: null,
    connections: [],
    
    init: () => {
        if(Network.peer) return;
        Network.peer = new Peer(userData.peerId);
        
        // 다른 플레이어가 내 게임에 접속했을 때
        Network.peer.on('connection', conn => {
            Network.connections.push(conn);
            Network.setupConn(conn);
        });
    },
    
    setupConn: (conn) => {
        conn.on('data', data => {
            if (data.type === 'chat') {
                const chatBox = document.getElementById('chat-messages');
                chatBox.innerHTML += `<div class="chat-msg"><span class="author">${data.id.substring(0,5)}</span> ${data.msg}</div>`;
                chatBox.scrollTop = chatBox.scrollHeight;
            }
            if (data.type === 'move') {
                Engine.otherPlayers[data.id] = data.pos;
            }
        });
    },
    
    joinGame: (hostId) => {
        if (hostId && hostId !== userData.peerId) {
            const conn = Network.peer.connect(hostId);
            conn.on('open', () => {
                Network.connections.push(conn);
                Network.setupConn(conn);
                
                const chatBox = document.getElementById('chat-messages');
                chatBox.innerHTML += `<div class="chat-msg system">월드에 성공적으로 연결되었습니다.</div>`;
            });
        }
    },
    
    sendChat: () => {
        const input = document.getElementById('chat-input');
        const msg = input.value.trim();
        if (!msg) return;
        
        const chatBox = document.getElementById('chat-messages');
        chatBox.innerHTML += `<div class="chat-msg" style="background: rgba(99, 102, 241, 0.4);"><span class="author">나</span> ${msg}</div>`;
        chatBox.scrollTop = chatBox.scrollHeight;
        
        Network.broadcast({ type: 'chat', id: userData.peerId, msg: msg });
        input.value = '';
    },
    
    broadcast: (data) => {
        Network.connections.forEach(conn => {
            if (conn.open) conn.send(data);
        });
    }
};

/* =========================================
   4. 게임 엔진 (렌더링, 물리, 카메라)
========================================= */
const Engine = {
    canvas: document.getElementById('game-canvas'),
    ctx: null,
    mode: 'menu', // 'edit' or 'play'
    gameData: null,
    loopId: null,
    
    camera: { x: 0, y: 0 },
    player: { x: 0, y: 0, w: 40, h: 40, vx: 0, vy: 0, grounded: false },
    otherPlayers: {},
    
    init: () => {
        Engine.ctx = Engine.canvas.getContext('2d');
        window.addEventListener('resize', Engine.resize);
        Engine.resize();
    },
    
    resize: () => {
        Engine.canvas.width = window.innerWidth;
        Engine.canvas.height = window.innerHeight;
    },
    
    start: (game, mode) => {
        Engine.gameData = game;
        Engine.mode = mode;
        Engine.otherPlayers = {};
        Engine.player = { x: 0, y: -50, w: 40, h: 40, vx: 0, vy: 0, grounded: false };
        Engine.camera = { x: 0, y: 0 };
        
        UI.showScreen('game-screen');
        
        // 모드에 따른 UI 토글
        document.getElementById('editor-ui').classList.toggle('hidden', mode !== 'edit');
        document.getElementById('play-ui').classList.toggle('hidden', mode !== 'play');
        document.getElementById('chat-messages').innerHTML = ''; // 채팅 초기화
        
        if (mode === 'play') {
            Network.init();
            Network.joinGame(game.creator);
        }
        
        if (Engine.loopId) cancelAnimationFrame(Engine.loopId);
        Engine.loop();
    },
    
    loop: () => {
        Engine.update();
        Engine.draw();
        Engine.loopId = requestAnimationFrame(Engine.loop);
    },
    
    update: () => {
        if (Engine.mode === 'play') {
            // 1. 물리 엔진 (이동 및 중력)
            const speed = 6;
            if (Input.keys['a'] || Input.joyX < -20) Engine.player.vx = -speed;
            else if (Input.keys['d'] || Input.joyX > 20) Engine.player.vx = speed;
            else Engine.player.vx = 0;

            if ((Input.keys['w'] || Input.keys[' '] || Input.jump) && Engine.player.grounded) {
                Engine.player.vy = -14;
                Engine.player.grounded = false;
            }

            Engine.player.vy += 0.8; // 중력 가속도
            Engine.player.x += Engine.player.vx;
            Engine.player.y += Engine.player.vy;

            // 2. AABB 블록 충돌 처리
            Engine.player.grounded = false;
            Engine.gameData.blocks.forEach(b => {
                if (b.type !== 'ground') return; // 화폐 박스는 통과 가능
                
                // 바닥 충돌 (떨어질 때만)
                if (Engine.player.vy > 0 && 
                    Engine.player.y + Engine.player.h >= b.y && 
                    Engine.player.y + Engine.player.h <= b.y + Engine.player.vy + 2 &&
                    Engine.player.x + Engine.player.w > b.x && 
                    Engine.player.x < b.x + b.w) {
                    
                    Engine.player.grounded = true;
                    Engine.player.vy = 0;
                    Engine.player.y = b.y - Engine.player.h;
                }
            });

            // 3. 카메라가 플레이어를 부드럽게 따라감 (Lerp)
            Engine.camera.x += ((Engine.player.x - window.innerWidth / 2) - Engine.camera.x) * 0.1;
            Engine.camera.y += ((Engine.player.y - window.innerHeight / 2) - Engine.camera.y) * 0.1;

            // 4. 내 위치 서버로 브로드캐스트 (최적화를 위해 프레임 제한)
            if (Math.random() < 0.2) { 
                Network.broadcast({ type: 'move', id: userData.peerId, pos: { x: Engine.player.x, y: Engine.player.y } });
            }
        } 
        else if (Engine.mode === 'edit') {
            // 편집 모드: 무한 카메라 패닝 (WASD)
            const panSpeed = 12;
            if (Input.keys['w']) Engine.camera.y -= panSpeed;
            if (Input.keys['s']) Engine.camera.y += panSpeed;
            if (Input.keys['a']) Engine.camera.x -= panSpeed;
            if (Input.keys['d']) Engine.camera.x += panSpeed;
        }
    },
    
    draw: () => {
        const ctx = Engine.ctx;
        ctx.clearRect(0, 0, Engine.canvas.width, Engine.canvas.height);
        
        ctx.save();
        // 핵심: 카메라 좌표계 적용으로 무한 맵 구현
        ctx.translate(-Engine.camera.x, -Engine.camera.y);

        // 그리드 (편집 모드일 때만)
        if (Engine.mode === 'edit') {
            ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            ctx.lineWidth = 1;
            const gridSize = 50;
            const startX = Math.floor(Engine.camera.x / gridSize) * gridSize;
            const startY = Math.floor(Engine.camera.y / gridSize) * gridSize;
            
            for(let x = startX; x < startX + window.innerWidth + gridSize; x += gridSize) {
                ctx.beginPath(); ctx.moveTo(x, Engine.camera.y); ctx.lineTo(x, Engine.camera.y + window.innerHeight); ctx.stroke();
            }
            for(let y = startY; y < startY + window.innerHeight + gridSize; y += gridSize) {
                ctx.beginPath(); ctx.moveTo(Engine.camera.x, y); ctx.lineTo(Engine.camera.x + window.innerWidth, y); ctx.stroke();
            }
        }

        // 블록 렌더링
        if (Engine.gameData) {
            Engine.gameData.blocks.forEach(b => {
                if (b.type === 'clicker') {
                    // 화폐 블록
                    ctx.fillStyle = 'rgba(251, 191, 36, 0.2)';
                    ctx.fillRect(b.x, b.y, b.w, b.h);
                    ctx.strokeStyle = '#fbbf24';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(b.x, b.y, b.w, b.h);
                    
                    ctx.fillStyle = '#fbbf24';
                    ctx.font = 'bold 16px Pretendard';
                    ctx.textAlign = 'center';
                    ctx.fillText('💰 CLICK', b.x + b.w/2, b.y + b.h/2 + 6);
                } else {
                    // 일반 블록 (글래스모피즘 스타일)
                    ctx.fillStyle = 'rgba(99, 102, 241, 0.7)';
                    ctx.fillRect(b.x, b.y, b.w, b.h);
                    ctx.strokeStyle = '#a5b4fc';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(b.x, b.y, b.w, b.h);
                }
            });
        }

        // 플레이어 렌더링
        if (Engine.mode === 'play') {
            // 다른 플레이어들
            ctx.fillStyle = 'rgba(239, 68, 68, 0.8)'; // 빨간색 계열
            for (let id in Engine.otherPlayers) {
                let p = Engine.otherPlayers[id];
                ctx.fillRect(p.x, p.y, Engine.player.w, Engine.player.h);
            }
            
            // 나 자신 (에메랄드)
            ctx.fillStyle = '#10b981';
            ctx.shadowColor = '#10b981';
            ctx.shadowBlur = 10;
            ctx.fillRect(Engine.player.x, Engine.player.y, Engine.player.w, Engine.player.h);
            ctx.shadowBlur = 0; // 초기화
        }
        
        ctx.restore();
    }
};

/* =========================================
   5. 입력 처리 (키보드, 마우스, 모바일 터치)
========================================= */
const Input = {
    keys: {},
    joyX: 0, joyY: 0, jump: false,
    currentTool: 'draw',
    
    init: () => {
        window.addEventListener('keydown', e => Input.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', e => Input.keys[e.key.toLowerCase()] = false);
        
        // 채팅창 엔터키 전송
        document.getElementById('chat-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') Network.sendChat();
        });

        // 캔버스 마우스/터치 클릭 처리 (블록 짓기 & 클릭커 화폐 얻기)
        Engine.canvas.addEventListener('mousedown', Input.handleCanvasClick);
        Engine.canvas.addEventListener('touchstart', (e) => {
            if (e.target === Engine.canvas) Input.handleCanvasClick(e.touches[0]);
        }, { passive: false });

        // 모바일 조이스틱 이벤트
        const joyBase = document.getElementById('joystick');
        const knob = document.getElementById('knob');
        
        const handleJoy = (e) => {
            e.preventDefault();
            const rect = joyBase.getBoundingClientRect();
            const touch = e.touches[0];
            let dx = touch.clientX - rect.left - 70; // 중심점 70
            let dy = touch.clientY - rect.top - 70;
            const dist = Math.min(Math.sqrt(dx*dx + dy*dy), 40); // 최대 반지름 40
            const angle = Math.atan2(dy, dx);
            
            Input.joyX = Math.cos(angle) * dist;
            Input.joyY = Math.sin(angle) * dist;
            
            knob.style.transform = `translate(${Input.joyX}px, ${Input.joyY}px)`;
        };
        
        joyBase.addEventListener('touchstart', handleJoy, {passive: false});
        joyBase.addEventListener('touchmove', handleJoy, {passive: false});
        joyBase.addEventListener('touchend', () => {
            Input.joyX = 0; Input.joyY = 0;
            knob.style.transform = `translate(0px, 0px)`;
        });

        // 모바일 점프 버튼 이벤트
        const jumpBtn = document.getElementById('jump-btn');
        jumpBtn.addEventListener('touchstart', (e) => { e.preventDefault(); Input.jump = true; });
        jumpBtn.addEventListener('touchend', (e) => { e.preventDefault(); Input.jump = false; });
    },
    
    handleCanvasClick: (e) => {
        // 화면 좌표를 게임 월드 좌표로 변환
        const worldX = e.clientX + Engine.camera.x;
        const worldY = e.clientY + Engine.camera.y;

        if (Engine.mode === 'edit') {
            // 50px 단위 그리드 스냅 적용
            const snapX = Math.floor(worldX / 50) * 50;
            const snapY = Math.floor(worldY / 50) * 50;

            if (Input.currentTool === 'erase') {
                // 클릭한 위치의 블록 삭제
                Engine.gameData.blocks = Engine.gameData.blocks.filter(b => 
                    !(worldX > b.x && worldX < b.x + b.w && worldY > b.y && worldY < b.y + b.h)
                );
            } else {
                // 블록 추가
                const type = Input.currentTool === 'clicker' ? 'clicker' : 'ground';
                const size = type === 'clicker' ? 100 : 50;
                Engine.gameData.blocks.push({ x: snapX, y: snapY, w: size, h: size, type: type });
            }
        } 
        else if (Engine.mode === 'play') {
            // 플레이 모드: 클릭커 화폐 얻기 로직
            Engine.gameData.blocks.forEach(b => {
                if (b.type === 'clicker' && worldX > b.x && worldX < b.x + b.w && worldY > b.y && worldY < b.y + b.h) {
                    userData.and += 1;
                    saveData();
                    UI.spawnParticle(e.clientX, e.clientY, '+1 and');
                    UI.showToast('1 and 획득!');
                }
            });
        }
    }
};

/* =========================================
   6. 외부 연결 API (HTML 인라인 이벤트용)
========================================= */
const Editor = {
    setTool: (tool) => {
        Input.currentTool = tool;
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById('tool-' + tool).classList.add('active');
    }
};

const GameApp = {
    createNewGame: () => {
        const name = document.getElementById('game-name').value || '이름 없는 세계';
        const desc = document.getElementById('game-desc').value || '설명이 없습니다.';
        const icon = document.getElementById('game-icon').value || '🌍';
        const price = parseInt(document.getElementById('game-pass-price').value) || 0;
        
        const newGame = {
            id: 'world_' + Date.now(),
            name, desc, icon, passPrice: price,
            creator: userData.peerId,
            blocks: [{ x: -200, y: 150, w: 800, h: 50, type: 'ground' }] // 기본 바닥
        };
        
        userData.games.push(newGame);
        saveData();
        UI.hidePublishModal();
        UI.showToast('새로운 세계가 창조되었습니다. 맵을 디자인하세요!');
        Engine.start(newGame, 'edit');
    },
    
    editGame: (id) => {
        const game = userData.games.find(g => g.id === id);
        if (game) {
            Engine.start(game, 'edit');
            UI.showToast('에디터 모드에 진입했습니다.');
        }
    },
    
    playGame: (id) => {
        const game = userData.games.find(g => g.id === id);
        if (game) {
            Engine.start(game, 'play');
            UI.showToast(`${game.name} 월드에 접속 중...`);
        }
    },
    
    buyPass: (id, price) => {
        if (userData.and >= price) {
            userData.and -= price;
            userData.purchasedPasses.push(id);
            saveData();
            UI.renderGameList();
            UI.showToast('패스 구매 성공! 이제 플레이할 수 있습니다.');
        } else {
            UI.showToast(`잔액 부족! (현재: ${userData.and} / 필요: ${price} and)`);
        }
    },
    
    saveAndExit: () => {
        saveData(); // 데이터는 객체 참조로 이미 업데이트 되어있으므로 로컬스토리지 저장만
        cancelAnimationFrame(Engine.loopId);
        UI.showScreen('main-menu');
        UI.renderGameList();
        UI.showToast('성공적으로 저장되었습니다.');
    },
    
    exitPlay: () => {
        cancelAnimationFrame(Engine.loopId);
        UI.showScreen('main-menu');
        UI.renderGameList();
    }
};

/* =========================================
   7. 앱 초기 실행
========================================= */
window.onload = () => {
    Engine.init();
    Input.init();
    UI.init();
};
