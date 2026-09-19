/**
 * ============================================================================
 * [초고퀄리티 웹 게임 통합 핵심 코어 엔진 - script.js]
 * ============================================================================
 * - DataManager : 예외 방지형 로컬 스토리지 데이터 & 맵 게시/공유 관리자
 * - SoundEngine : Web Audio API 기반 오실레이터 SFX 효과음 합성기
 * - Joystick     : 터치/마우스 멀티 포인터 360도 아날로그 조이스틱
 * - InputManager : 키보드 & 조이스틱 입력을 단일 인터페이스로 통합하는 입력기
 * - ParticleEngine: 캔버스 및 DOM 대응 파티클 이펙트 시스템
 * ============================================================================
 */

// ============================================================================
// 1. DataManager (데이터 영속성 & 맵 커뮤니티 데이터 관리)
// ============================================================================
const DataManager = {
    KEYS: {
        COINS: 'game_coins',
        WORKING_MAP: 'game_working_map',
        PUBLISHED_LIST: 'game_published_list',
        USER_STATS: 'game_user_stats'
    },

    /**
     * 보유 광물(코인) 안전 조회
     * @returns {number}
     */
    getCoins: () => {
        try {
            const raw = localStorage.getItem(DataManager.KEYS.COINS);
            const coins = parseInt(raw, 10);
            if (isNaN(coins) || coins < 0) {
                localStorage.setItem(DataManager.KEYS.COINS, '0');
                return 0;
            }
            return coins;
        } catch (e) {
            console.error('[DataManager] 코인 읽기 오류:', e);
            return 0;
        }
    },

    /**
     * 보유 광물(코인) 증감 및 저장 (NaN 및 음수 완벽 방지)
     * @param {number} amount 
     * @returns {number} 변경된 최종 코인 수량
     */
    addCoins: (amount) => {
        let addVal = Math.floor(Number(amount));
        if (isNaN(addVal)) addVal = 0;

        const current = DataManager.getCoins();
        const updated = Math.max(0, current + addVal);
        
        try {
            localStorage.setItem(DataManager.KEYS.COINS, updated.toString());
        } catch (e) {
            console.error('[DataManager] 코인 저장 오류:', e);
        }
        return updated;
    },

    /**
     * 현재 작업 중인 에디터 맵 로드
     * @returns {Object} 맵 객체 { title, author, mode, grid }
     */
    getWorkingMap: () => {
        try {
            const saved = localStorage.getItem(DataManager.KEYS.WORKING_MAP);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && Array.isArray(parsed.grid) && parsed.grid.length === 15) {
                    return parsed;
                }
            }
        } catch (e) {
            console.warn('[DataManager] 작업 맵 복구 중 실패, 기본값으로 초기화합니다.');
        }

        // 기본 15x20 빈 맵 반환
        return {
            title: "나만의 모험 맵",
            author: "익명 개발자",
            mode: "platformer", // 'platformer' 또는 'topdown'
            grid: Array.from({ length: 15 }, () => Array(20).fill(0))
        };
    },

    /**
     * 작업 맵 임시 저장
     * @param {Object} mapObj 
     */
    saveWorkingMap: (mapObj) => {
        try {
            localStorage.setItem(DataManager.KEYS.WORKING_MAP, JSON.stringify(mapObj));
        } catch (e) {
            console.error('[DataManager] 작업 맵 저장 실패:', e);
        }
    },

    /**
     * 커뮤니티에 게시된 게임 목록 조회
     * @returns {Array<Object>}
     */
    getPublishedGames: () => {
        try {
            const raw = localStorage.getItem(DataManager.KEYS.PUBLISHED_LIST);
            if (raw) {
                const list = JSON.parse(raw);
                if (Array.isArray(list)) return list;
            }
        } catch (e) {
            console.error('[DataManager] 게시글 목록 데이터 읽기 실패:', e);
        }

        // 기본 제공 웰컴 샘플 맵
        const defaultSample = [{
            id: 'sample_default_01',
            title: '🔥 초심자 탈출 레이스',
            author: '시스템 관리자',
            mode: 'platformer',
            date: new Date().toLocaleDateString('ko-KR'),
            grid: [
                [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5],
                [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
                [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,1,0,0],
                [0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0],
                [0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,0],
                [0,0,0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,0,0],
                [0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
                [0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,2,2,2,0,0],
                [0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1],
                [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
                [0,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0],
                [0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0],
                [0,0,0,0,0,0,0,0,0,0,2,2,2,0,0,0,0,0,0,0],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
            ]
        }];
        
        localStorage.setItem(DataManager.KEYS.PUBLISHED_LIST, JSON.stringify(defaultSample));
        return defaultSample;
    },

    /**
     * 맵 게시하기
     * @param {string} title 
     * @param {string} author 
     * @param {string} mode 
     * @param {Array} grid 
     * @returns {Object} 생성된 게시글
     */
    publishMap: (title, author, mode, grid) => {
        const list = DataManager.getPublishedGames();
        const newGame = {
            id: 'map_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            title: title.trim() || '무제 모험 맵',
            author: author.trim() || '익명 크리에이터',
            mode: mode || 'platformer',
            date: new Date().toLocaleDateString('ko-KR'),
            grid: JSON.parse(JSON.stringify(grid))
        };

        list.unshift(newGame); // 최신글을 맨 앞으로
        try {
            localStorage.setItem(DataManager.KEYS.PUBLISHED_LIST, JSON.stringify(list));
        } catch (e) {
            console.error('[DataManager] 맵 게시 실패:', e);
        }
        return newGame;
    },

    /**
     * 맵 데이터 Base64 인코딩 스트링으로 내보내기
     * @param {Object} mapObj 
     * @returns {string}
     */
    exportCode: (mapObj) => {
        try {
            const jsonStr = JSON.stringify(mapObj);
            return btoa(encodeURIComponent(jsonStr));
        } catch (e) {
            console.error('[DataManager] 코드 내보내기 실패:', e);
            return '';
        }
    },

    /**
     * Base64 맵 코드로 데이터 객체 복원하기
     * @param {string} codeStr 
     * @returns {Object|null}
     */
    importCode: (codeStr) => {
        try {
            const decoded = decodeURIComponent(atob(codeStr.trim()));
            const parsed = JSON.parse(decoded);
            if (parsed && parsed.grid && Array.isArray(parsed.grid)) {
                return parsed;
            }
        } catch (e) {
            console.error('[DataManager] 코드 가져오기 실패:', e);
        }
        return null;
    }
};

// ============================================================================
// 2. SoundEngine (Web Audio API 기반 합성 사운드 엔진)
// ============================================================================
const SoundEngine = {
    ctx: null,

    /** 오디오 컨텍스트 초기화 및 브라우저 차단 해제 */
    init() {
        if (!SoundEngine.ctx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                SoundEngine.ctx = new AudioContextClass();
            }
        }
        if (SoundEngine.ctx && SoundEngine.ctx.state === 'suspended') {
            SoundEngine.ctx.resume();
        }
    },

    /**
     * 다양한 게임 내 효과음 재생
     * @param {string} type - 'click', 'crit', 'buy', 'jump', 'coin', 'die', 'win', 'bounce'
     */
    play(type) {
        try {
            SoundEngine.init();
            if (!SoundEngine.ctx) return;

            const ctx = SoundEngine.ctx;
            const now = ctx.currentTime;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            switch (type) {
                case 'click':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(320, now);
                    osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);
                    gain.gain.setValueAtTime(0.2, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
                    osc.start(now);
                    osc.stop(now + 0.08);
                    break;

                case 'crit':
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(750, now);
                    osc.frequency.exponentialRampToValueAtTime(180, now + 0.22);
                    gain.gain.setValueAtTime(0.35, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
                    osc.start(now);
                    osc.stop(now + 0.22);
                    break;

                case 'buy':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(523.25, now); // C5
                    osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
                    osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
                    gain.gain.setValueAtTime(0.25, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
                    osc.start(now);
                    osc.stop(now + 0.28);
                    break;

                case 'jump':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(150, now);
                    osc.frequency.exponentialRampToValueAtTime(480, now + 0.15);
                    gain.gain.setValueAtTime(0.25, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                    osc.start(now);
                    osc.stop(now + 0.15);
                    break;

                case 'bounce':
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(200, now);
                    osc.frequency.exponentialRampToValueAtTime(650, now + 0.2);
                    gain.gain.setValueAtTime(0.3, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                    osc.start(now);
                    osc.stop(now + 0.2);
                    break;

                case 'coin':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(987.77, now); // B5
                    osc.frequency.setValueAtTime(1318.51, now + 0.07); // E6
                    gain.gain.setValueAtTime(0.2, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                    osc.start(now);
                    osc.stop(now + 0.2);
                    break;

                case 'die':
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(280, now);
                    osc.frequency.linearRampToValueAtTime(50, now + 0.35);
                    gain.gain.setValueAtTime(0.3, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
                    osc.start(now);
                    osc.stop(now + 0.35);
                    break;

                case 'win':
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(523.25, now);
                    osc.frequency.setValueAtTime(659.25, now + 0.1);
                    osc.frequency.setValueAtTime(783.99, now + 0.2);
                    osc.frequency.setValueAtTime(1046.50, now + 0.3);
                    gain.gain.setValueAtTime(0.25, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                    osc.start(now);
                    osc.stop(now + 0.5);
                    break;

                default:
                    break;
            }
        } catch (e) {
            // 브라우저 정책 차단 오차 무시
        }
    }
};

// ============================================================================
// 3. Joystick (터치/마우스 포인터 360도 컨트롤러)
// ============================================================================
class Joystick {
    /**
     * @param {string} containerId - 조이스틱을 담고 있는 컨테이너 ID
     */
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.stick = this.container.querySelector('.stick');
        this.maxRadius = 50;
        this.active = false;
        this.value = { x: 0, y: 0 };
        this.origin = { x: 0, y: 0 };

        this.initEvents();
    }

    initEvents() {
        this.container.addEventListener('pointerdown', this.start.bind(this));
        window.addEventListener('pointermove', this.move.bind(this));
        window.addEventListener('pointerup', this.end.bind(this));
        window.addEventListener('pointercancel', this.end.bind(this));
    }

    start(e) {
        SoundEngine.init();
        this.active = true;
        const rect = this.container.getBoundingClientRect();
        this.maxRadius = rect.width / 2;
        this.origin = {
            x: rect.left + this.maxRadius,
            y: rect.top + this.maxRadius
        };
        this.updatePosition(e.clientX, e.clientY);
        this.container.style.touchAction = 'none';
    }

    move(e) {
        if (!this.active) return;
        this.updatePosition(e.clientX, e.clientY);
    }

    end() {
        this.active = false;
        this.value = { x: 0, y: 0 };
        if (this.stick) {
            this.stick.style.transform = `translate(-50%, -50%)`;
        }
        if (this.container) {
            this.container.style.touchAction = 'auto';
        }
    }

    updatePosition(clientX, clientY) {
        let dx = clientX - this.origin.x;
        let dy = clientY - this.origin.y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > this.maxRadius) {
            dx = (dx / distance) * this.maxRadius;
            dy = (dy / distance) * this.maxRadius;
        }

        if (this.stick) {
            this.stick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        }

        // -1.0 ~ 1.0 방향 벡터 정규화
        this.value.x = dx / this.maxRadius;
        this.value.y = dy / this.maxRadius;
    }
}

// ============================================================================
// 4. InputManager (키보드 & 조이스틱 통합 입력 감지)
// ============================================================================
const InputManager = {
    keys: {},
    joystick: null,

    init(joystickInstance = null) {
        InputManager.joystick = joystickInstance;

        window.addEventListener('keydown', (e) => {
            InputManager.keys[e.code] = true;
        });

        window.addEventListener('keyup', (e) => {
            InputManager.keys[e.code] = false;
        });
    },

    /**
     * X축 입력값 반환 (-1.0 ~ 1.0)
     */
    getAxisX() {
        let x = 0;
        if (InputManager.keys['ArrowLeft'] || InputManager.keys['KeyA']) x -= 1;
        if (InputManager.keys['ArrowRight'] || InputManager.keys['KeyD']) x += 1;

        if (x !== 0) return x;
        return InputManager.joystick ? InputManager.joystick.value.x : 0;
    },

    /**
     * Y축 입력값 반환 (-1.0 ~ 1.0)
     */
    getAxisY() {
        let y = 0;
        if (InputManager.keys['ArrowUp'] || InputManager.keys['KeyW']) y -= 1;
        if (InputManager.keys['ArrowDown'] || InputManager.keys['KeyS']) y += 1;

        if (y !== 0) return y;
        return InputManager.joystick ? InputManager.joystick.value.y : 0;
    },

    /** 점프 트리거 체크 (스페이스바 또는 조이스틱 상단 올림) */
    isJumpPressed() {
        const keyJump = InputManager.keys['Space'] || InputManager.keys['ArrowUp'] || InputManager.keys['KeyW'];
        const joyJump = InputManager.joystick ? InputManager.joystick.value.y < -0.65 : false;
        return keyJump || joyJump;
    }
};

// ============================================================================
// 5. ParticleEngine (파티클 비주얼 이펙트 시스템)
// ============================================================================
class ParticleEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas ? canvas.getContext('2d') : null;
        this.particles = [];
    }

    /**
     * 폭발/스파크 파티클 생성
     */
    emit(x, y, count = 10, color = '#00f0ff') {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 4 + 1;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 4 + 2,
                alpha: 1.0,
                color: color,
                life: Math.random() * 0.4 + 0.6
            });
        }
    }

    /** 파티클 업데이트 및 렌더링 */
    updateAndRender() {
        if (!this.ctx) return;

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= 0.03;

            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            this.ctx.save();
            this.ctx.globalAlpha = p.alpha;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }
    }
}

// 전역 브라우저 액션 초기화 시 유저 상호작용 사운드 잠금 해제
window.addEventListener('pointerdown', () => SoundEngine.init(), { once: true });
