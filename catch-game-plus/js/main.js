// 遊戲相關元素
const gameArea = document.getElementById("game-area");
const basket = document.getElementById("basket");
const scoreText = document.getElementById("score");
const bestScoreText = document.getElementById("best-score");
const timeText = document.getElementById("time");
const startBtn = document.getElementById("start-btn");
const difficultySelect = document.getElementById("difficulty");
const message = document.getElementById("message");
const leaderboardList = document.getElementById("leaderboard-list");

// 音效
const sndCatch = document.getElementById("snd-catch");
const sndBad = document.getElementById("snd-bad");
const sndGameover = document.getElementById("snd-gameover");

// 遊戲參數
const GAME_WIDTH = 400;
const GAME_HEIGHT = 400;
const BASKET_WIDTH = 70;
const STORAGE_KEY = "catchGameScores_v1";

// 不同難度設定
const DIFFICULTY_CONFIG = {
    easy:   { time: 35, spawn: 900, fallSpeed: 2.3, label: "簡單" },
    normal: { time: 30, spawn: 750, fallSpeed: 3.1, label: "普通" },
    hard:   { time: 25, spawn: 550, fallSpeed: 4.0, label: "困難" }
};

// 掉落物種類
const ITEM_TYPES = [
    { color: "#4caf50", score: 1 },   // 綠色 +1
    { color: "#ffeb3b", score: 3 },   // 黃色 +3
    { color: "#f44336", score: -1 }   // 紅色 -1
];

// 遊戲狀態
let score = 0;
let bestScore = 0;
let timeLeft = 30;
let basketX = (GAME_WIDTH - BASKET_WIDTH) / 2;
let moveLeft = false;
let moveRight = false;
let isPlaying = false;
let items = [];
let spawnTimer = null;
let countdownTimer = null;
let currentConfig = DIFFICULTY_CONFIG["normal"];

// 初始化
basket.style.left = basketX + "px";
loadBestScore();
renderLeaderboard();

// 監聽按鍵
document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        moveLeft = true;
    }
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        moveRight = true;
    }
});

document.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        moveLeft = false;
    }
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        moveRight = false;
    }
});

// 開始遊戲按鈕
startBtn.addEventListener("click", startGame);

function startGame() {
    // 讀取目前難度設定
    const level = difficultySelect.value;
    currentConfig = DIFFICULTY_CONFIG[level];

    score = 0;
    timeLeft = currentConfig.time;
    scoreText.textContent = score;
    timeText.textContent = timeLeft;
    message.textContent = "";
    clearItems();
    isPlaying = true;

    // 開始生成掉落物
    spawnTimer = setInterval(spawnItem, currentConfig.spawn);

    // 倒數計時
    countdownTimer = setInterval(() => {
        timeLeft--;
        timeText.textContent = timeLeft;
        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);

    // 啟動主迴圈
    requestAnimationFrame(gameLoop);
}

function endGame() {
    isPlaying = false;
    clearInterval(spawnTimer);
    clearInterval(countdownTimer);

    // 播放結束音效
    playSound(sndGameover);

    message.textContent = `時間到！你的分數是：${score} 分`;

    // 更新最高分與排行榜
    if (score > 0) {
        updateBestScore(score);
        updateLeaderboard(score);
    }
}

// 主遊戲迴圈：控制籃子、掉落物更新
function gameLoop() {
    if (!isPlaying) return;

    // 籃子移動
    if (moveLeft) {
        basketX -= 6;
    }
    if (moveRight) {
        basketX += 6;
    }

    // 邊界限制
    basketX = Math.max(0, Math.min(GAME_WIDTH - BASKET_WIDTH, basketX));
    basket.style.left = basketX + "px";

    // 更新掉落物
    updateItems();

    // 下一幀
    requestAnimationFrame(gameLoop);
}

// 生成新的掉落物
function spawnItem() {
    const itemEl = document.createElement("div");
    itemEl.classList.add("falling-item");

    // 隨機決定種類
    const type = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
    itemEl.style.backgroundColor = type.color;

    const maxX = GAME_WIDTH - 26; // 掉落物寬度
    const x = Math.floor(Math.random() * maxX);
    itemEl.style.left = x + "px";
    itemEl.style.top = "-26px";

    gameArea.appendChild(itemEl);

    items.push({
        element: itemEl,
        x: x,
        y: -26,
        score: type.score
    });
}

// 更新所有掉落物位置與碰撞檢查
function updateItems() {
    const basketRect = basket.getBoundingClientRect();
    const areaRect = gameArea.getBoundingClientRect();

    for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        item.y += currentConfig.fallSpeed;
        item.element.style.top = item.y + "px";

        const itemRect = item.element.getBoundingClientRect();

        // 碰撞判斷
        const isHit =
            itemRect.bottom >= basketRect.top &&
            itemRect.left < basketRect.right &&
            itemRect.right > basketRect.left;

        if (isHit) {
            // 分數加減
            score += item.score;
            if (score < 0) score = 0;
            scoreText.textContent = score;

            // 播音效 & 碰撞動畫
            if (item.score >= 0) {
                playSound(sndCatch);
            } else {
                playSound(sndBad);
            }
            triggerHitAnimation();

            // 移除這個物件
            gameArea.removeChild(item.element);
            items.splice(i, 1);
            continue;
        }

        // 掉出畫面底部
        if (itemRect.top > areaRect.bottom) {
            gameArea.removeChild(item.element);
            items.splice(i, 1);
        }
    }
}

// 清除所有掉落物
function clearItems() {
    for (const item of items) {
        if (item.element.parentNode === gameArea) {
            gameArea.removeChild(item.element);
        }
    }
    items = [];
}

// 碰撞動畫
function triggerHitAnimation() {
    basket.classList.add("hit");
    setTimeout(() => {
        basket.classList.remove("hit");
    }, 200);
}

// 播放音效（避免瀏覽器限制錯誤時不報錯）
function playSound(audioEl) {
    if (!audioEl) return;
    audioEl.currentTime = 0;
    audioEl.play().catch(() => {
        // 部分瀏覽器可能因使用者未互動而拒絕自動播放，忽略錯誤即可
    });
}

// ===== 排行榜 & 最高分相關 =====

function loadBestScore() {
    const scores = loadScores();
    if (scores.length > 0) {
        bestScore = scores[0].score;
    } else {
        bestScore = 0;
    }
    bestScoreText.textContent = bestScore;
}

// 讀取 localStorage 中的分數資料
function loadScores() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
            return arr;
        }
        return [];
    } catch (e) {
        return [];
    }
}

// 儲存分數陣列到 localStorage
function saveScores(scores) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
}

// 更新最高分
function updateBestScore(newScore) {
    if (newScore > bestScore) {
        bestScore = newScore;
        bestScoreText.textContent = bestScore;
    }
}

// 更新排行榜：加入新紀錄並顯示
function updateLeaderboard(newScore) {
    const name = prompt("請輸入你的名字（可留空）：", "玩家") || "玩家";
    const now = new Date();
    const record = {
        name: name,
        score: newScore,
        time: now.toLocaleString()
    };

    const scores = loadScores();
    scores.push(record);

    // 依分數高到低排序
    scores.sort((a, b) => b.score - a.score);

    // 只保留前 5 名
    const top5 = scores.slice(0, 5);
    saveScores(top5);

    renderLeaderboard();
}

// 將排行榜顯示在畫面上
function renderLeaderboard() {
    const scores = loadScores();
    leaderboardList.innerHTML = "";

    if (scores.length === 0) {
        const li = document.createElement("li");
        li.textContent = "目前尚無紀錄，快來挑戰吧！";
        leaderboardList.appendChild(li);
        return;
    }

    scores.forEach((record, index) => {
        const li = document.createElement("li");
        li.textContent = `${index + 1}. ${record.name} —— ${record.score} 分`;
        leaderboardList.appendChild(li);
    });
}
