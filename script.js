/**
 * ============================================================================
 * NexBlock - Ultimate Game Engine Script
 * Architecture: Singleton Modules (Core, DB, UI, Physics, Multiplayer)
 * ============================================================================
 */

/* ==========================================================================
   1. 데이터베이스 및 코어 시스템 (LocalDB)
   ========================================================================== */
const NexDB = {
    key: 'NexBlock_UserData_v1',
    data: {
        and: 0,            // 재화
        vipPass: false,    // VIP 여부
        createdMaps: []    // 유저가 만든 맵 데이터
    },

    init() {
        const saved = localStorage.getItem(this.key);
        if (saved) {
            this.data = { ...this.data, ...JSON.parse(saved) };
        } else {
            this.save();
        }
    },

    save() {
        localStorage.setItem(this.key, JSON.stringify(this.data));
    },

    addAND(amount) {
        this.data.and += amount;
        this.save();
    }
};

// 앱 초기화 시 DB 로드
NexDB.init();

/* ==========================================================================
   2. 글로벌 UI 유틸리티 (토스트 알림 등)
   ========================================================================== */
const UI = {
    showToast(message, type = 'info') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type} fade-in-up`;
        toast.innerHTML = `<span class="material-symbols-outlined">${type === 'success' ? 'check_circle' : 'info'}</span> ${message}`;
        
        container.appendChild(toast);

        // 3초 후 애니메이션과 함께 제거
        setTimeout(() => {
            toast.style.animation = 'fadeInDown 0.5s reverse forwards';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    },

    updateCurrencyUI() {
        const displays = document.querySelectorAll('.currency-amount');
        displays.forEach(el => {
            // 숫자 카운팅 애니메이션 효과
            const target = NexDB.data.and;
            let current = parseInt(el.innerText.replace(/,/g, '')) || 0;
            const diff = target - current;
            if (diff === 0) {
                el.innerText = target.toLocaleString();
                return;
            }
            
            const step = Math.ceil(diff / 10);
            const timer = setInterval(() => {
                current += step;
                if ((step > 0 && current >= target) || (step < 0 && current <= target)) {
                    current = target;
                    clearInterval(timer);
                }
                el.innerText = current.toLocaleString();
            }, 30);
        });
    }
};

/* ==========================================================================
   3. 로비 모드 (index.html)
   ========================================================================== */
window.initLobby = function() {
    UI.updateCurrencyUI();

    // 더미 서버 데이터 (실제로는 fetch API 등을 통해 가져옴)
    const mockGames = [
        { id: 1, title: '파쿠르 오리진', desc: '용암을 피해 끝까지 도달하세요!', icon: 'sports_gymnastics', color: '#ff4500' },
        { id: 2, title: '좀비 서바이벌', desc: '다가오는 감염자들을 막아내세요.', icon: 'coronavirus', color: '#32cd32', vip: true },
        { id: 3, title: '네온 시티 타워', desc: '미래 도시의 가장 높은 곳으로.', icon: 'domain', color: '#00ffcc' }
    ];

    setTimeout(() => {
        renderGameGrid(mockGames);
    }, 800); // 스켈레톤 로딩을 보여주기 위한 인위적 지연
};

function renderGameGrid(games) {
    const container = document.getElementById('games-container');
    if (!container) return;
    
    container.innerHTML = ''; // 스켈레톤 제거

    // 내가 만든 맵 추가
    NexDB.data.createdMaps.forEach((map, index) => {
        games.unshift({ id: `custom_${index}`, title: '나의 맵 ' + (index+1), desc: '내가 에디터로 만든 커스텀 월드', icon: 'map', color: '#ff00ff', isCustom: true });
    });

    games.forEach(game => {
        const isLocked = game.vip && !NexDB.data.vipPass;
        
        const card = document.createElement('div');
        card.className = 'game-card fade-in-up';
        card.innerHTML = `
            <div class="card-header">
                <div class="game-icon" style="color: ${game.color}; text-shadow: 0 0 15px ${game.color}55;">
                    <span class="material-symbols-outlined" style="font-size: 2.5rem;">${game.icon}</span>
                </div>
                ${game.vip ? '<div class="pass-badge"><span class="material-symbols-outlined" style="font-size: 14px;">stars</span> VIP</div>' : ''}
            </div>
            <h3 class="game-title">${game.title}</h3>
            <p class="game-desc">${game.desc}</p>
            <button class="btn btn-primary full-width" style="${isLocked ? 'background:#555; box-shadow:none;' : ''}" onclick="enterGame('${game.id}', ${isLocked})">
                ${isLocked ? '<span class="material-symbols-outlined">lock</span> VIP 전용' : '플레이'}
            </button>
        `;
        container.appendChild(card);
    });
}

window.enterGame = function(gameId, isLocked) {
    if (isLocked) {
        UI.showToast('VIP 패스가 필요합니다!', 'danger');
        return;
    }
    // 페이지 이동 효과 (화면 암전 후 이동)
    document.body.style.transition = 'opacity 0.5s';
    document.body.style.opacity = '0';
    setTimeout(() => {
        window.location.href = `play.html?id=${gameId}`;
    }, 500);
};

window.buyPass = function() {
    if (NexDB.data.vipPass) {
        UI.showToast('이미 VIP 패스를 보유하고 있습니다.', 'success');
        return;
    }
    if (NexDB.data.and >= 500) {
        NexDB.data.and -= 500;
        NexDB.data.vipPass = true;
        NexDB.save();
        UI.updateCurrencyUI();
        UI.showToast('VIP 패스 구매 완료!', 'success');
        if(window.initLobby) window.initLobby(); // 로비 새로고침
    } else {
        UI.showToast('AND가 부족합니다. 차원 채굴기에서 모아보세요!', 'danger');
    }
};

/* ==========================================================================
   4. 클리커 모드 (clicker.html) - 타격감 및 파티클 엔진
   ========================================================================== */
let comboCount = 0;
let comboTimeout = null;

window.initClickerMode = function() {
    UI.updateCurrencyUI();
    initParticleEngine();
};

window.triggerClick = function(event) {
    event.preventDefault(); // 더블탭 줌 방지

    // 1. 재화 증가
    let earnAmount = 1 + Math.floor(comboCount / 10); // 콤보 10당 1씩 추가 수익
    NexDB.addAND(earnAmount);
    UI.updateCurrencyUI();

    // 2. 콤보 시스템
    comboCount++;
    const comboDisplay = document.getElementById('combo-display');
    const comboNum = document.getElementById('combo-count');
    
    comboDisplay.classList.remove('fade-out');
    comboDisplay.style.opacity = '1';
    comboNum.innerText = `x${comboCount}`;
    comboNum.classList.add('combo-bump');
    setTimeout(() => comboNum.classList.remove('combo-bump'), 100);

    clearTimeout(comboTimeout);
    comboTimeout = setTimeout(() => {
        comboCount = 0;
        comboDisplay.style.opacity = '0';
    }, 1500); // 1.5초간 클릭 없으면 콤보 초기화

    // 3. 화면 흔들림 효과 (Camera Shake)
    const body = document.getElementById('clicker-body');
    body.classList.remove('shake-screen');
    void body.offsetWidth; // DOM Reflow 강제 실행 (애니메이션 재시작 트릭)
    body.classList.add('shake-screen');

    // 4. 터치(클릭) 좌표 계산
    let clientX, clientY;
    if (event.touches && event.touches.length > 0) {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
    } else {
        clientX = event.clientX;
        clientY = event.clientY;
    }

    // 5. 플로팅 텍스트 (+1 AND)
    spawnFloatingText(clientX, clientY, `+${earnAmount}`);
    
    // 6. 파티클 폭발 효과
    spawnParticles(clientX, clientY);
};

function spawnFloatingText(x, y, text) {
    const el = document.createElement('div');
    el.className = 'floating-text';
    el.innerText = text;
    el.style.left = `${x - 20}px`;
    el.style.top = `${y - 20}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

// 캔버스 기반 파티클 엔진
const particles = [];
let fxCanvas, fxCtx;

function initParticleEngine() {
    fxCanvas = document.getElementById('clicker-fx-canvas');
    if(!fxCanvas) return;
    fxCtx = fxCanvas.getContext('2d');
    
    const resize = () => {
        fxCanvas.width = window.innerWidth;
        fxCanvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    requestAnimationFrame(renderParticles);
}

function spawnParticles(x, y) {
    for (let i = 0; i < 10; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 15,
            vy: (Math.random() - 1.5) * 15, // 위로 솟구치게
            life: 1.0,
            color: Math.random() > 0.5 ? '#00ffcc' : '#ffd700'
        });
    }
}

function renderParticles() {
    if(!fxCtx) return;
    fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
    
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.vy += 0.5; // 중력
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02; // 수명 감소

        if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
        }

        fxCtx.globalAlpha = p.life;
        fxCtx.fillStyle = p.color;
        fxCtx.beginPath();
        fxCtx.arc(p.x, p.y, 4 + p.life * 4, 0, Math.PI * 2);
        fxCtx.fill();
        fxCtx.globalAlpha = 1.0;
    }
    requestAnimationFrame(renderParticles);
}

/* ==========================================================================
   5. 에디터 모드 (editor.html) - 그리드 스내핑 및 그리기
   ========================================================================== */
let currentTool = 'block'; // block, spawn, erase
let mapGrid = [];
const TILE_SIZE = 40;
let camX = 0, camY = 0;
let isDragging = false, lastMouseX, lastMouseY;

window.initEditorMode = function() {
    const canvas = document.getElementById('editor-canvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', resize);
    resize();

    // 툴 선택 로직
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('selected'));
            e.currentTarget.classList.add('selected');
            currentTool = e.currentTarget.dataset.tool;
        });
    });

    // 캔버스 마우스/터치 이벤트 (팬 & 줌, 그리기)
    canvas.addEventListener('mousedown', editorPointerDown);
    canvas.addEventListener('mousemove', editorPointerMove);
    canvas.addEventListener('mouseup', () => isDragging = false);
    
    // 모바일 터치 대응
    canvas.addEventListener('touchstart', (e) => editorPointerDown(e.touches[0]));
    canvas.addEventListener('touchmove', (e) => editorPointerMove(e.touches[0]));
    canvas.addEventListener('touchend', () => isDragging = false);

    function editorPointerDown(e) {
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        if(e.button === 2) { isDragging = true; return; } // 우클릭(드래그)
        
        applyTool(e.clientX, e.clientY);
        isDragging = true; // 좌클릭도 드래그하며 그리기 허용
    }

    function editorPointerMove(e) {
        if (!isDragging) return;
        
        if (e.buttons === 2 || (e.touches && e.touches.length > 1)) { // 패닝 (카메라 이동)
            camX += e.clientX - lastMouseX;
            camY += e.clientY - lastMouseY;
            lastMouseX = e.clientX; lastMouseY = e.clientY;
        } else {
            applyTool(e.clientX, e.clientY);
        }
    }

    // 캔버스 우클릭 메뉴 방지
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    function applyTool(clientX, clientY) {
        // 월드 좌표로 변환 후 그리드 인덱스 계산
        const gridX = Math.floor((clientX - camX) / TILE_SIZE);
        const gridY = Math.floor((clientY - camY) / TILE_SIZE);

        // 맵 데이터에서 해당 좌표 검색
        const existingIdx = mapGrid.findIndex(t => t.x === gridX && t.y === gridY);

        if (currentTool === 'erase') {
            if (existingIdx > -1) mapGrid.splice(existingIdx, 1);
        } else {
            if (existingIdx === -1) {
                mapGrid.push({ x: gridX, y: gridY, type: currentTool });
            } else {
                mapGrid[existingIdx].type = currentTool;
            }
        }
    }

    // 에디터 렌더링 루프
    function renderEditor() {
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(camX, camY);

        // 1. 그리드 라인 그리기 (배경)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        const startX = Math.floor(-camX / TILE_SIZE) * TILE_SIZE;
        const startY = Math.floor(-camY / TILE_SIZE) * TILE_SIZE;
        for(let x = startX; x < canvas.width - camX; x += TILE_SIZE) {
            ctx.beginPath(); ctx.moveTo(x, -camY); ctx.lineTo(x, canvas.height - camY); ctx.stroke();
        }
        for(let y = startY; y < canvas.height - camY; y += TILE_SIZE) {
            ctx.beginPath(); ctx.moveTo(-camX, y); ctx.lineTo(canvas.width - camX, y); ctx.stroke();
        }

        // 2. 배치된 블록 그리기
        mapGrid.forEach(tile => {
            const px = tile.x * TILE_SIZE;
            const py = tile.y * TILE_SIZE;
            
            if (tile.type === 'block') {
                ctx.fillStyle = '#00ffcc';
                ctx.shadowColor = '#00ffcc';
                ctx.shadowBlur = 10;
                ctx.fillRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
                ctx.shadowBlur = 0;
            } else if (tile.type === 'spawn') {
                ctx.fillStyle = '#ff00ff';
                ctx.beginPath();
                ctx.arc(px + TILE_SIZE/2, py + TILE_SIZE/2, TILE_SIZE/2 - 2, 0, Math.PI*2);
                ctx.fill();
            }
        });

        ctx.restore();
        requestAnimationFrame(renderEditor);
    }
    requestAnimationFrame(renderEditor);
};

window.saveMap = function() {
    if (mapGrid.length === 0) {
        UI.showToast('배치된 블록이 없습니다.', 'danger');
        return;
    }
    NexDB.data.createdMaps.push(mapGrid);
    NexDB.save();
    UI.showToast('맵이 성공적으로 저장되었습니다!', 'success');
};


/* ==========================================================================
   6. 플레이 모드 (play.html) - 물리 엔진 & 멀티플레이(PeerJS) & 조이스틱
   ========================================================================== */
window.initPlayMode = function(gameId) {
    console.log("Loading Game:", gameId);

    // 1. 로딩 스크린 해제
    setTimeout(() => {
        const loader = document.getElementById('loading-screen');
        if(loader) loader.classList.remove('active');
        UI.showToast('서버 접속 성공!', 'success');
    }, 1500); // 1.5초 가짜 로딩 연출

    // 2. 캔버스 및 물리엔진 설정
    const canvas = document.getElementById('play-canvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', resize);
    resize();

    // 맵 데이터 불러오기 (임시 생성)
    let blocks = [];
    for(let i=0; i<20; i++) {
        blocks.push({ x: i * 50, y: window.innerHeight - 100, w: 50, h: 50 });
    }

    // 플레이어 객체 (AABB 물리)
    const player = {
        x: window.innerWidth / 2, y: 100, width: 30, height: 30,
        vx: 0, vy: 0,
        speed: 5, jumpForce: -12, gravity: 0.6,
        isGrounded: false, color: '#00ffcc'
    };

    // 3. 컨트롤 (키보드 & 모바일 조이스틱)
    const keys = { a: false, d: false, w: false };
    
    window.addEventListener('keydown', e => {
        if(document.activeElement.id === 'chat-input') return; // 채팅중 이동 방지
        if(e.key.toLowerCase() === 'a') keys.a = true;
        if(e.key.toLowerCase() === 'd') keys.d = true;
        if(e.key.toLowerCase() === 'w' || e.key === ' ') {
            if(player.isGrounded) player.vy = player.jumpForce;
        }
    });
    window.addEventListener('keyup', e => {
        if(e.key.toLowerCase() === 'a') keys.a = false;
        if(e.key.toLowerCase() === 'd') keys.d = false;
    });

    // --- 조이스틱 로직 (Vector Math) ---
    const joyContainer = document.getElementById('play-joystick');
    const joyKnob = document.getElementById('play-knob');
    let joyActive = false;
    let joyCX = 0, joyCY = 0; // 중심점

    if(joyContainer) {
        joyContainer.addEventListener('touchstart', e => {
            e.preventDefault();
            const rect = joyContainer.getBoundingClientRect();
            joyCX = rect.left + rect.width / 2;
            joyCY = rect.top + rect.height / 2;
            joyActive = true;
            handleJoyMove(e.touches[0]);
        }, {passive: false});

        joyContainer.addEventListener('touchmove', e => {
            e.preventDefault();
            if(joyActive) handleJoyMove(e.touches[0]);
        }, {passive: false});

        joyContainer.addEventListener('touchend', e => {
            joyActive = false;
            joyKnob.style.transform = `translate(0px, 0px)`;
            player.vx = 0; // 이동 중지
        });

        function handleJoyMove(touch) {
            let dx = touch.clientX - joyCX;
            let dy = touch.clientY - joyCY;
            const maxRadius = 40;
            const distance = Math.sqrt(dx*dx + dy*dy);
            
            if(distance > maxRadius) {
                dx = (dx / distance) * maxRadius;
                dy = (dy / distance) * maxRadius;
            }
            
            joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
            // 좌우 이동 값 매핑 (-1 ~ 1) * 속도
            player.vx = (dx / maxRadius) * player.speed;
        }
    }

    // 모바일 점프 버튼
    const jumpBtn = document.getElementById('jump-btn');
    if(jumpBtn) {
        jumpBtn.addEventListener('touchstart', e => {
            e.preventDefault();
            if(player.isGrounded) player.vy = player.jumpForce;
        });
    }

    // 4. 메인 게임 루프 (Physics & Rendering)
    function gameLoop() {
        // Physics update
        if(keys.a) player.vx = -player.speed;
        else if(keys.d) player.vx = player.speed;
        else if(!joyActive) player.vx *= 0.8; // 마찰력

        player.vy += player.gravity;
        player.x += player.vx;
        player.y += player.vy;

        // 바닥 충돌 처리 (매우 간소화된 AABB)
        player.isGrounded = false;
        blocks.forEach(b => {
            // AABB Collision check
            if (player.x < b.x + b.w && player.x + player.width > b.x &&
                player.y < b.y + b.h && player.y + player.height > b.y) {
                
                // 위에서 떨어질 때만 충돌 (플랫포머 방식)
                if (player.vy > 0 && player.y + player.height - player.vy <= b.y) {
                    player.y = b.y - player.height;
                    player.vy = 0;
                    player.isGrounded = true;
                }
            }
        });

        // 화면 밖으로 나가면 부활
        if(player.y > canvas.height) {
            player.x = window.innerWidth / 2;
            player.y = 50;
            player.vy = 0;
        }

        // Render
        ctx.fillStyle = '#050510';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 맵 그리기 (네온 효과)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.strokeStyle = '#fff';
        blocks.forEach(b => {
            ctx.fillRect(b.x, b.y, b.w, b.h);
            ctx.strokeRect(b.x, b.y, b.w, b.h);
        });

        // 플레이어 그리기 (글로우 효과)
        ctx.shadowColor = player.color;
        ctx.shadowBlur = 15;
        ctx.fillStyle = player.color;
        ctx.fillRect(player.x, player.y, player.width, player.height);
        ctx.shadowBlur = 0;

        requestAnimationFrame(gameLoop);
    }
    requestAnimationFrame(gameLoop);

    // 5. 채팅 위젯 UI 제어
    window.toggleChat = function() {
        const body = document.getElementById('chat-body-container');
        const icon = document.getElementById('chat-toggle-icon');
        if (body.style.height === '0px') {
            body.style.height = '250px';
            icon.innerText = 'expand_more';
        } else {
            body.style.height = '0px';
            icon.innerText = 'expand_less';
        }
    };

    window.sendChat = function() {
        const input = document.getElementById('chat-input');
        const text = input.value.trim();
        if(!text) return;
        
        appendChatMsg('나', text, true);
        input.value = '';
        
        // 멀티플레이 데모용 가짜 자동응답
        setTimeout(() => {
            appendChatMsg('알 수 없는 유저', '안녕하세요! 멀티플레이 맵에 오신걸 환영합니다.', false);
        }, 1000);
    };

    // 엔터키 채팅 전송
    const chatInput = document.getElementById('chat-input');
    if(chatInput) {
        chatInput.addEventListener('keypress', e => {
            if(e.key === 'Enter') sendChat();
        });
    }

    function appendChatMsg(sender, text, isMe) {
        const box = document.getElementById('chat-box');
        const msg = document.createElement('div');
        msg.className = 'chat-msg';
        msg.innerHTML = `<b style="color: ${isMe ? 'var(--primary)' : 'var(--secondary)'}">${sender}:</b> ${text}`;
        box.appendChild(msg);
        box.scrollTop = box.scrollHeight;
    }
};

window.exitGame = function() {
    window.location.href = 'index.html';
};
