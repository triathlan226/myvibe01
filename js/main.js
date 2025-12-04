let timeLeft = 30;
let score = 0;
let basketX = 170;
let moveLeft = false;
let moveRight = false;
let isPlaying = false;
let items = [];
let spawnTimer = null;
let countdownTimer = null;

const gameArea = document.getElementById("game-area");
const basket = document.getElementById("basket");
const scoreText = document.getElementById("score");
const timeText = document.getElementById("time");
const startBtn = document.getElementById("start-btn");
const message = document.getElementById("message");

basket.style.left = basketX + "px";

document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") moveLeft = true;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") moveRight = true;
});
document.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") moveLeft = false;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") moveRight = false;
});

startBtn.addEventListener("click", startGame);

function startGame() {
    score = 0;
    timeLeft = 30;
    scoreText.textContent = score;
    timeText.textContent = timeLeft;
    message.textContent = "";
    clearItems();
    isPlaying = true;

    spawnTimer = setInterval(spawnItem, 900);
    countdownTimer = setInterval(() => {
        timeLeft--;
        timeText.textContent = timeLeft;
        if (timeLeft <= 0) endGame();
    }, 1000);

    requestAnimationFrame(gameLoop);
}

function endGame() {
    isPlaying = false;
    clearInterval(spawnTimer);
    clearInterval(countdownTimer);
    message.textContent = `時間到！你的分數是：${score} 分`;
}

function gameLoop() {
    if (!isPlaying) return;

    if (moveLeft) basketX -= 6;
    if (moveRight) basketX += 6;

    basketX = Math.max(0, Math.min(340, basketX));
    basket.style.left = basketX + "px";

    updateItems();
    requestAnimationFrame(gameLoop);
}

function spawnItem() {
    const item = document.createElement("div");
    item.classList.add("falling-item");
    const x = Math.floor(Math.random() * 375);
    item.style.left = x + "px";
    item.style.top = "-25px";
    gameArea.appendChild(item);

    items.push({ element: item, x: x, y: -25 });
}

function updateItems() {
    const basketRect = basket.getBoundingClientRect();
    const areaRect = gameArea.getBoundingClientRect();

    for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        item.y += 2.5;
        item.element.style.top = item.y + "px";
        const itemRect = item.element.getBoundingClientRect();

        const isHit =
            itemRect.bottom >= basketRect.top &&
            itemRect.left < basketRect.right &&
            itemRect.right > basketRect.left;

        if (isHit) {
            score++;
            scoreText.textContent = score;
            gameArea.removeChild(item.element);
            items.splice(i, 1);
            continue;
        }

        if (itemRect.top > areaRect.bottom) {
            gameArea.removeChild(item.element);
            items.splice(i, 1);
        }
    }
}

function clearItems() {
    for (const item of items) gameArea.removeChild(item.element);
    items = [];
}
