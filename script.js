/**
 * [차세대 통합 게임 엔진 코어 - script.js]
 * - 게시(Publish) & 맵 코드 공유 시스템
 * - 클리커 안전 연동 및 상점 데이터 보장
 * - 멀티 플레이 물리 & 사운드 엔진
 */

// ==========================================
// 1. DataManager (데이터 & 게시판 시스템)
// ==========================================
const DataManager = {
    // 코인 세이프티 로직
    getCoins: () => {
        const val = parseInt(localStorage.getItem('game_coins'), 10);
        return (isNaN(val) || val < 0) ? 0 : val;
    },
    addCoins: (amount) => {
        let add = Math.floor(Number(amount)) || 0;
        let newCoins = Math.max(0, DataManager.getCoins() + add);
        localStorage.setItem('game_coins', newCoins.toString());
        return newCoins;
    },

    // 현재 편집 중인 작업용 맵
    getWorkingMap: () => {
        try {
            const saved = localStorage.getItem('game_working_map');
            if (saved) return JSON.parse(saved);
        } catch (e) {}
        return {
            title: "제목 없는 맵",
            author: "익명",
            mode: "platformer", // 'platformer' 또는 'topdown'
            grid: Array.from({ length: 15 }, () => Array(20).fill(0))
        };
    },
    saveWorkingMap: (mapObj) => {
        localStorage.setItem('game_working_map', JSON.stringify(mapObj));
    },

    // 🚀 [신규] 게시된 게임 목록 (커뮤니티 게시판)
    getPublishedGames: () => {
        try {
            const list = localStorage.getItem('game_published_list');
            if (list) return JSON.parse(list);
        } catch (e) {}
        // 기본 샘플 맵 1개 제공
        return [{
            id: 'sample_1',
            title: '🔥 대기열 첫 번째 모험',
            author: '운영자',
            mode: 'platformer',
            date: '2026.09.20',
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
    },

    // 맵 게시하기
    publishMap: (title, author, mode, grid) => {
        const published = DataManager.getPublishedGames();
        const newGame = {
            id: 'map_' + Date.now(),
            title: title || '제목 없음',
            author: author || '익명',
            mode: mode || 'platformer',
            date: new Date().toLocaleDateString(),
            grid: grid
        };
        published.unshift(newGame);
        localStorage.setItem('game_published_list', JSON.stringify(published));
        return newGame;
    },

    // 맵 코드로 텍스트 내보내기/불러오기
    exportCode: (mapObj) => btoa(encodeURIComponent(JSON.stringify(mapObj))),
    importCode: (codeStr) => {
        try {
            return JSON.parse(decodeURIComponent(atob(codeStr)));
        } catch (e) {
            alert('유효하지 않은 맵 코드입니다.');
            return null;
        }
    }
};

// ==========================================
// 2. Joystick (조이스틱 제어)
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

        this.container.addEventListener('pointerdown', this.start.bind(this));
        window.addEventListener('pointermove', this.move.bind(this));
        window.addEventListener('pointerup', this.end.bind(this));
        window.addEventListener('pointercancel', this.end.bind(this));
    }
    start(e) {
        this.active = true;
        const rect = this.container.getBoundingClientRect();
        this.maxRadius = rect.width / 2;
        this.origin = { x: rect.left + this.maxRadius, y: rect.top + this.maxRadius };
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
        if (this.stick) this.stick.style.transform = `translate(-50%, -50%)`;
        if (this.container) this.container.style.touchAction = 'auto';
    }
    updatePosition(clientX, clientY) {
        let dx = clientX - this.origin.x;
        let dy = clientY - this.origin.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > this.maxRadius) {
            dx = (dx / dist) * this.maxRadius;
            dy = (dy / dist) * this.maxRadius;
        }
        if (this.stick) this.stick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        this.value.x = dx / this.maxRadius;
        this.value.y = dy / this.maxRadius;
    }
}

// ==========================================
// 3. SoundEngine (내장 오디오)
// ==========================================
const SoundEngine = {
    ctx: null,
    init() {
        if (!SoundEngine.ctx) SoundEngine.ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (SoundEngine.ctx.state === 'suspended') SoundEngine.ctx.resume();
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

            if (type === 'jump') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.exponentialRampToValueAtTime(400, now + 0.15);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                osc.start(now); osc.stop(now + 0.15);
            } else if (type === 'coin') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(987, now);
                osc.frequency.setValueAtTime(1318, now + 0.08);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                osc.start(now); osc.stop(now + 0.2);
            } else if (type === 'die') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.linearRampToValueAtTime(60, now + 0.3);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.start(now); osc.stop(now + 0.3);
            } else if (type === 'win') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(523, now);
                osc.frequency.setValueAtTime(659, now + 0.1);
                osc.frequency.setValueAtTime(783, now + 0.2);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                osc.start(now); osc.stop(now + 0.4);
            }
        } catch (e) {}
    }
};
