/**
 * [웹 게임 통합 코어 엔진 - script.js]
 * - 안전한 데이터 관리 (NaN 및 데이터 유실 완벽 방지)
 * - 초고성능 Pointer 기반 조이스틱 (모바일/PC 통합)
 * - 공용 Web Audio 사운드 시스템
 */

// ==========================================
// 1. DataManager (데이터 연산 및 예외 처리)
// ==========================================
const DataManager = {
    // 안전한 코인 수급 조회 (NaN 검증)
    getCoins: () => {
        const raw = localStorage.getItem('game_coins');
        const coins = parseInt(raw, 10);
        if (isNaN(coins) || coins < 0) {
            localStorage.setItem('game_coins', '0');
            return 0;
        }
        return coins;
    },

    // 안전한 코인 추가 및 차감
    addCoins: (amount) => {
        let addVal = Math.floor(Number(amount));
        if (isNaN(addVal)) addVal = 0; // 숫자가 아니면 0 처리
        
        let currentCoins = DataManager.getCoins();
        let newCoins = Math.max(0, currentCoins + addVal); // 음수 방지
        
        localStorage.setItem('game_coins', newCoins.toString());
        return newCoins;
    },

    // 맵 데이터 안전하게 불러오기
    getMap: () => {
        try {
            const saved = localStorage.getItem('game_map');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {
            console.warn('맵 데이터 복구 중:', e);
        }
        // 기본 15x20 그리드 생성
        return Array.from({ length: 15 }, () => Array(20).fill(0));
    },

    // 맵 데이터 저장
    saveMap: (mapData) => {
        try {
            localStorage.setItem('game_map', JSON.stringify(mapData));
        } catch (e) {
            console.error('맵 저장 실패:', e);
        }
    }
};

// ==========================================
// 2. Joystick (터치/마우스 멀티 디바이스 반응)
// ==========================================
class Joystick {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.stick = this.container.querySelector('.stick');
        this.maxRadius = this.container.clientWidth / 2 || 50;
        this.active = false;
        this.value = { x: 0, y: 0 };
        this.origin = { x: 0, y: 0 };

        // Pointer Event 사용 (마우스와 터치를 단일 이벤트로 처리)
        this.container.addEventListener('pointerdown', this.start.bind(this));
        window.addEventListener('pointermove', this.move.bind(this));
        window.addEventListener('pointerup', this.end.bind(this));
        window.addEventListener('pointercancel', this.end.bind(this));
    }

    start(e) {
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

        // 정규화된 벡터 (-1.0 ~ 1.0)
        this.value.x = dx / this.maxRadius;
        this.value.y = dy / this.maxRadius;
    }
}

// ==========================================
// 3. SoundEngine (초고퀄리티 오디오 시스템)
// ==========================================
const SoundEngine = {
    ctx: null,
    init() {
        if (!SoundEngine.ctx) {
            SoundEngine.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (SoundEngine.ctx.state === 'suspended') {
            SoundEngine.ctx.resume();
        }
    },
    play(type) {
        try {
            SoundEngine.init();
            const ctx = SoundEngine.ctx;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.connect(gain);
            gain.connect(ctx.destination);

            const now = ctx.currentTime;

            if (type === 'click') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(350, now);
                osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
                osc.start(now);
                osc.stop(now + 0.08);
            } else if (type === 'crit') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(200, now + 0.2);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                osc.start(now);
                osc.stop(now + 0.2);
            } else if (type === 'buy') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(523.25, now);
                osc.frequency.setValueAtTime(659.25, now + 0.08);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                osc.start(now);
                osc.stop(now + 0.2);
            }
        } catch (e) {
            // 오디오 브라우저 차단 무시
        }
    }
};
