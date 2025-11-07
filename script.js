// script.js
console.log("Script.js yükleniyor...");

// HTML elementlerini seç
const game = document.getElementById("game");
const player = document.getElementById("player");
const bulletsContainer = document.getElementById("bullets");
const enemyBulletsContainer = document.getElementById("enemy-bullets");
const playerBombsContainer = document.getElementById("player-bombs-container");
const enemiesContainer = document.getElementById("enemies");
const pizzasContainer = document.getElementById("pizzas");
const powerupsContainer = document.getElementById("powerups-container");
const messageElement = document.getElementById("message");
const scoreboard = document.getElementById("scoreboard");
const playerHealthBar = document.getElementById("player-health");
const startScreen = document.getElementById("start-screen");
const startButton = document.getElementById("start-button");
const gameMusic = document.getElementById("gameMusic");
const weaponIconElement = document.getElementById("weapon-icon");
const ultimateVisualEffectElement = document.getElementById("ultimate-visual-effect");

// Yeni eklenen bomba UI elementleri
const bombCountElement = document.getElementById("bomb-count");
const bombCooldownProgressBar = document.getElementById("bomb-cooldown-progress");
const bombUIElement = document.getElementById("bomb-ui");

let gameCanvas, ctx; // Yağmur efekti için

// Oyun değişkenleri
let playerX, playerY, playerVelX, playerVelY, playerAccX;
let isJumping;
let bullets, enemyBullets, enemies, pizzas, bombs, playerBombsArray, powerUps;
let score, playerHealth;
let keys = {}; // Klavye tuş basımlarını takip etmek için boş nesne olarak başlatılır
const groundOffset = 20; // Yerden yükseklik sabiti

// Ateş ve Yetenek Değişkenleri
let pistolShootCooldown, lastPistolShotTime;
let hasDoubleShot, doubleShotTimerId;
const DOUBLE_SHOT_DURATION = 10000; // Çift atış gücünün süresi (10 saniye)

let playerBombCount; // Oyuncunun sahip olduğu bomba sayısı
const MAX_BOMBS = 10; // Maksimum bomba sayısı
let playerBombCooldown = 3000; // Bomba bekleme süresi (3 saniye)
let lastPlayerBombTime; // Son bomba atıldığı veya kazanıldığı zaman

let ultimateCharge, ultimateChargeMax, isUltimateReady; // Ulti yeteneği değişkenleri

let currentBoss, isBossActive, isBossDefeated; // Boss durumu değişkenleri
let gameStage, enemyImage, enemyMaxCount; // Oyun aşaması ve düşman bilgileri
let animationFrameId; // requestAnimationFrame ID'si
let raindrops, maxRaindrops; // Yağmur efekti için
let isGameOver; // Oyunun bitip bitmediği

let jKeyHeld = false; // "J" tuşunun basılı tutulup tutulmadığını kontrol etmek için

// Hareket ve Fizik Sabitleri
const MOVE_ACCELERATION = 0.3; // Yatay hareket ivmesi
const MAX_HORIZONTAL_SPEED = 4; // Maksimum yatay hız
const FRICTION = 0.2; // Sürtünme değeri
const JUMP_POWER = 11; // Zıplama gücü
const GRAVITY = 0.5; // Yerçekimi etkisi

// Boss Tetikleme Puanları
const DIAZ_TRIGGER_SCORE = 850;
const LANCE_TRIGGER_SCORE = 2000;
const SONY_TRIGGER_SCORE = 3000;

// --- Yardımcı Fonksiyonlar ---

/**
 * İki dikdörtgenin çarpışıp çarpışmadığını kontrol eder.
 * @param {object} rect1 - Birinci dikdörtgenin pozisyon ve boyut bilgileri (x, y, width, height).
 * @param {object} rect2 - İkinci dikdörtgenin pozisyon ve boyut bilgileri (x, y, width, height).
 * @returns {boolean} Çarpışma varsa true, yoksa false.
 */
function checkCollision(rect1, rect2) {
    if (!rect1 || !rect2) return false;
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height && // Y pozisyonu kontrolü düzeltildi
           rect1.y + rect1.height > rect2.y;
}

/**
 * Bir HTML elementinin anlık pozisyon ve boyut bilgilerini döndürür.
 * CSS 'left' ve 'bottom' değerlerini kullanır.
 * @param {HTMLElement} element - Pozisyonu alınacak HTML elementi.
 * @returns {object} Elementin pozisyon ve boyut bilgileri (x, y, width, height, bottomVal, leftVal).
 */
function getRect(element) {
    if (!element || !element.style || !game) {
        return { x: 0, y: 0, width: 0, height: 0, bottomVal: 0, leftVal: 0 };
    }
    
    const style = window.getComputedStyle(element);
    const leftVal = parseFloat(style.left) || 0;
    const bottomVal = parseFloat(style.bottom) || 0;
    const width = parseFloat(style.width) || element.clientWidth || 32;
    const height = parseFloat(style.height) || element.clientHeight || 32;

    return {
        x: leftVal,
        y: game.clientHeight - bottomVal - height, // Y pozisyonu ekranın üstünden hesaplanır
        width: width,
        height: height,
        bottomVal: bottomVal,
        leftVal: leftVal
    };
}

/**
 * Oyunun arka plan resmini değiştirir ve pozisyonunu sıfırlar.
 * @param {string} imageName - Yeni arka plan resminin URL'si.
 */
function changeBackground(imageName) {
    if (game) {
        game.style.backgroundImage = `url('${imageName}')`;
        game.style.backgroundPositionX = "0px";
    }
}

/**
 * Oyuna kısa süreli ekran sallanma efekti uygular.
 */
function applyScreenShake() {
    if (game) {
        game.classList.add("screen-shake");
        setTimeout(() => {
            if (game) game.classList.remove("screen-shake");
        }, 300);
    }
}

// --- Oyun Öğesi Oluşturma ---

/**
 * Yeni bir düşman elementi oluşturur ve oyuna ekler.
 */
function createEnemy() {
    // Boss aktifken (Sony hariç) veya düşman limiti dolduğunda yeni düşman yaratmayı engelle
    if (!enemiesContainer || !game || (enemies.length >= enemyMaxCount && (!isBossActive || (isBossActive && currentBoss && currentBoss.name !== 'Sony')))) return;
    
    const enemy = document.createElement("div");
    enemy.className = "enemy";
    enemy.style.backgroundImage = `url('${enemyImage}')`;
    enemy.style.left = (game.clientWidth + Math.random() * 200) + "px"; // Ekran dışından gelmesini sağlar
    enemy.style.bottom = groundOffset + "px";
    const healthBar = document.createElement("div");
    healthBar.className = "enemy-health";
    enemy.health = 100; // Düşmanın canı
    enemy.appendChild(healthBar);
    enemiesContainer.appendChild(enemy);
    enemies.push(enemy);
}

/**
 * Yeni bir pizza elementi oluşturur (iyi veya kötü olabilir) ve oyuna ekler.
 */
function createPizza() {
    // Boss aktifken veya pizza limiti dolduğunda yeni pizza yaratmayı engelle
    if (!pizzasContainer || !game || pizzas.length >= 3 || isBossActive) return;
    const pizza = document.createElement("div");
    pizza.className = "pizza-box";
    pizza.style.left = (game.clientWidth + Math.random() * 300) + "px"; // Ekran dışından gelmesini sağlar
    let pizzaYPos = groundOffset;
    if (Math.random() < 0.4) pizzaYPos = groundOffset + Math.random() * 60 + 50; // Bazen havada gelsin
    pizza.style.bottom = pizzaYPos + "px";
    pizza.isBad = Math.random() < 0.25; // %25 ihtimalle kötü pizza
    if (pizza.isBad) pizza.classList.add('stinky-pizza');
    pizzasContainer.appendChild(pizza);
    pizzas.push(pizza);
}

/**
 * Yeni bir güçlendirme (power-up) elementi oluşturur ve oyuna ekler.
 */
function createPowerUp() {
    // Boss aktifken veya zaten bir güçlendirme varsa yeni güçlendirme yaratmayı engelle
    if (!powerupsContainer || !game || powerUps.length >= 1 || isBossActive) return;
    const powerUp = document.createElement("div");
    powerUp.className = "power-up";
    powerUp.type = 'double-shot'; // Güçlendirme türü
    powerUp.classList.add('double-shot-powerup');
    powerUp.style.left = (game.clientWidth + Math.random() * 100) + "px";
    powerUp.style.bottom = (groundOffset + Math.random() * 70 + 60) + "px";
    powerupsContainer.appendChild(powerUp);
    powerUps.push(powerUp);
}

/**
 * Belirtilen isimde bir boss düşman oluşturur ve oyuna ekler.
 * Boss geldiğinde diğer tüm oyun öğelerini (düşman, pizza, bomba, güçlendirme) temizler.
 * @param {string} bossName - Oluşturulacak boss'un adı (Diaz, Lance, Sony).
 */
function createBoss(bossName) {
    if (!game || !enemiesContainer || !pizzasContainer || !playerBombsContainer || !powerupsContainer) return;
    console.log(`${bossName} oluşturuluyor...`);
    
    // Boss geldiğinde tüm normal düşmanları, pizzaları, güçlendirmeleri ve bombaları temizle
    [enemies, pizzas, powerUps].forEach(arr => {
        arr.forEach(item => item.remove());
        arr.length = 0;
    });
    // Boss'un kendi bombaları ve oyuncunun bombaları temizlenir
    bombs.forEach(b => b.element.remove()); bombs.length = 0;
    playerBombsArray.forEach(pb => pb.element.remove()); playerBombsArray.length = 0;

    // Önceki boss varsa DOM'dan kaldır
    if (currentBoss && currentBoss.element) currentBoss.element.remove();

    const bossElement = document.createElement("div");
    bossElement.id = "boss";
    bossElement.style.backgroundImage = `url('${bossName.toLowerCase()}.png')`;
    bossElement.style.left = game.clientWidth + "px"; // Ekranın sağından gelecek
    bossElement.style.bottom = groundOffset + "px";
    const healthBar = document.createElement("div");
    healthBar.className = "boss-health";
    bossElement.appendChild(healthBar);
    game.appendChild(bossElement);

    let maxHP = 500, dmgMultiplier = 1;
    if (bossName === 'Lance') { maxHP = 700; dmgMultiplier = 1.2; }
    else if (bossName === 'Sony') { maxHP = 1000; dmgMultiplier = 1.5; }
    
    isBossActive = true;
    isBossDefeated = false; // Yeni boss başladığında sıfırla
    currentBoss = { name: bossName, element: bossElement, health: maxHP, maxHealth: maxHP, damageMultiplier: dmgMultiplier, lastAttackTime: 0, attackCooldown: 1000 };
    updateBossHealthBar(); // Boss can barını güncelle
}

/**
 * Boss'un can barını günceller.
 */
function updateBossHealthBar() {
    if (!currentBoss || !currentBoss.element) return;
    const healthBar = currentBoss.element.querySelector('.boss-health');
    if (healthBar) healthBar.style.width = Math.max(0, (currentBoss.health / currentBoss.maxHealth) * 96) + "px";
}

/**
 * Boss'un oyuncuya bomba atmasını sağlar.
 * @param {object} boss - Bomba atacak boss nesnesi.
 */
function throwBossBomb(boss) {
    if (!enemyBulletsContainer || !boss || !boss.element) return;
    const bombElement = document.createElement("div");
    bombElement.className = "bomb";
    const bossRect = getRect(boss.element);
    bombElement.style.left = (bossRect.x + bossRect.width / 2 - 16) + "px"; // Bomba pozisyonunu ayarla
    bombElement.style.bottom = (game.clientHeight - bossRect.y - bossRect.height / 2 + 10) + "px";
    
    const bombSpeedX = -4; // Oyuncuya doğru yatay hız
    const bombSpeedY = 7; // Hafif yukarı doğru dikey hız
    
    const bombData = { element: bombElement, velX: bombSpeedX, velY: bombSpeedY, isExploding: false, damageRadius: 60, damageAmount: 25 };
    bombs.push(bombData);
    enemyBulletsContainer.appendChild(bombElement);
}

/**
 * Boss'un oyuncuya mermi atmasını sağlar.
 * @param {object} boss - Mermi atacak boss nesnesi.
 */
function shootBossBullet(boss) {
    if (!enemyBulletsContainer || !boss || !boss.element) return;
    const bullet = document.createElement("div");
    bullet.className = "enemy-bullet";
    const bossRect = getRect(boss.element);
    bullet.style.left = (bossRect.x + bossRect.width / 2 - 5) + "px"; // Mermi pozisyonunu ayarla
    bullet.style.bottom = (game.clientHeight - bossRect.y - bossRect.height / 2 - 2) + "px";
    enemyBulletsContainer.appendChild(bullet);
    enemyBullets.push({ element: bullet, speed: 7 }); // Mermi hızı
}

// --- Güncelleme Fonksiyonları ---

/**
 * Oyuncu karakterinin pozisyonunu ve animasyonunu günceller.
 */
function updatePlayer() {
    if (!player || !game) return;

    // Oyuncunun mevcut yönünü belirle
    const oldDirection = player.style.transform === 'scaleX(-1)' ? -1 : 1;
    let newDirection = oldDirection;

    playerAccX = 0; // Her karede ivmeyi sıfırla

    // Klavye girişine göre yatay hareket ivmesini ayarla
    if (keys["a"] || keys["arrowleft"]) {
        playerAccX = -MOVE_ACCELERATION;
        newDirection = -1; // Sola bak
    } else if (keys["d"] || keys["arrowright"]) {
        playerAccX = MOVE_ACCELERATION;
        newDirection = 1; // Sağa bak
    } else {
        // Tuş basılı değilse sürtünme uygula
        if (playerVelX > FRICTION) playerAccX = -FRICTION;
        else if (playerVelX < -FRICTION) playerAccX = FRICTION;
        else { playerVelX = 0; playerAccX = 0; } // Hız sıfıra yakınsa tamamen sıfırla
    }

    // Yön değiştiyse CSS transform özelliğini uygula
    if (newDirection !== oldDirection) {
        player.style.transform = (newDirection === -1) ? 'scaleX(-1)' : 'scaleX(1)';
    }

    // Hızı ivmeye göre güncelle ve maksimum hızı aşmasını engelle
    playerVelX += playerAccX;
    playerVelX = Math.max(-MAX_HORIZONTAL_SPEED, Math.min(playerVelX, MAX_HORIZONTAL_SPEED));
    playerX += playerVelX;
    playerX = Math.max(0, Math.min(playerX, game.clientWidth - player.clientWidth)); // Ekran sınırları içinde tut

    // Oyuncu animasyon sınıfı yönetimi
    if (playerY === 0) { // Yerdeyken
        if (playerVelX !== 0) {
            player.classList.add('running'); // Koşma animasyonunu başlat
            if (Math.random() < 0.2) createParticle(playerX + (player.clientWidth / 2), game.clientHeight - groundOffset - 5);
        } else { // Duruyorsa
            player.classList.remove('running'); // Koşma animasyonunu durdur
            // Atış veya zıplama animasyonu yoksa varsayılan resme dön
            if (player.style.backgroundImage.indexOf('shoot') === -1 && !isJumping) {
                 player.style.backgroundImage = "url('player.png')";
            }
        }
    }

    // Zıplama kontrolü
    if ((keys["w"] || keys[" "]) && !isJumping && playerY === 0) {
        playerVelY = JUMP_POWER;
        isJumping = true;
        player.classList.remove('running'); // Zıplarken koşma animasyonu olmasın
        player.style.backgroundImage = "url('player_jump.png')"; // Zıplama animasyonunu ayarla
    }

    // Yerçekimi ve dikey hareket
    playerVelY -= GRAVITY;
    playerY += playerVelY;

    // Zemine değme kontrolü
    if (playerY <= 0) {
        playerY = 0; playerVelY = 0; isJumping = false;
        // Zıplamadan sonra yere düşünce idle/run durumuna geç
        if (playerVelX === 0 && player.style.backgroundImage.indexOf('shoot') === -1) {
            player.style.backgroundImage = "url('player.png')";
        } else if (playerVelX !== 0) {
            player.classList.add('running');
        }
    }

    // Oyuncunun pozisyonunu güncelle
    player.style.left = playerX + "px";
    player.style.bottom = groundOffset + playerY + "px";
}

/**
 * Oyuncunun mermi atmasını sağlar.
 * Çift atış güçlendirmesi varsa iki mermi atar.
 */
function shootBullet() {
    // Ateş etme bekleme süresi kontrolü
    if (!player || !bulletsContainer || Date.now() - lastPistolShotTime < pistolShootCooldown) return;
    lastPistolShotTime = Date.now();

    // Oyuncu atış animasyonu
    player.style.backgroundImage = "url('player_shoot.png')";
    setTimeout(() => {
        if (!player) return; // Oyuncu yoksa devam etme
        if (isJumping) player.style.backgroundImage = "url('player_jump.png')";
        else if (player.classList.contains('running')) { /* CSS animasyonu devam eder */ } // Koşma animasyonu kendi kendine döner
        else player.style.backgroundImage = "url('player.png')";
    }, 150); // Atış animasyonu süresi

    /**
     * Tek bir mermi örneği oluşturur.
     * @param {number} offsetX - Merminin yatay başlangıç ofseti.
     * @param {number} offsetY - Merminin dikey başlangıç ofseti.
     */
    const createSingleBulletInstance = (offsetX = 0, offsetY = 0) => {
        const bullet = document.createElement("div");
        bullet.className = "bullet";
        const bulletWidth = 10, bulletHeight = 4;
        let bulletDirection = (player.style.transform === 'scaleX(-1)') ? -1 : 1; // Oyuncunun yönüne göre mermi yönü
        let bulletStartX = playerX + (player.clientWidth / 2) - (bulletWidth / 2);
        
        // Merminin çıkış noktasını karakterin baktığı yöne göre ayarla
        if (bulletDirection === -1) bulletStartX = playerX + offsetX - bulletWidth + 5; // Sola bakan oyuncu için
        else bulletStartX = playerX + player.clientWidth + offsetX - 5; // Sağa bakan oyuncu için

        bullet.style.left = bulletStartX + "px";
        bullet.style.bottom = (groundOffset + playerY + (player.clientHeight / 2.2) - (bulletHeight / 2) + offsetY) + "px";
        bulletsContainer.appendChild(bullet);
        bullets.push({ element: bullet, direction: bulletDirection, speed: 10 });
    };

    // Çift atış aktifse iki mermi, değilse tek mermi at
    if (hasDoubleShot) {
        createSingleBulletInstance(0, -3); // Üst mermi
        createSingleBulletInstance(0, 3);  // Alt mermi
    } else {
        createSingleBulletInstance();
    }
}

/**
 * Oyuncu ve düşman mermilerinin pozisyonlarını ve çarpışmalarını günceller.
 */
function updateBullets() {
    if(!game) return;

    // Oyuncu Mermileri
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        // Element geçerli değilse veya DOM'dan kaldırıldıysa diziden çıkar
        if (!bullet || !bullet.element || !bullet.element.style) { bullets.splice(i, 1); continue; }
        
        let currentBulletX = parseFloat(bullet.element.style.left);
        currentBulletX += bullet.speed * bullet.direction; // Mermiyi hareket ettir
        bullet.element.style.left = currentBulletX + "px";

        let bulletHitSomething = false;

        // Boss ile çarpışma kontrolü
        if (isBossActive && currentBoss && currentBoss.element) {
            if (checkCollision(getRect(bullet.element), getRect(currentBoss.element))) {
                handleBossHitByPlayerBullet(bullet.element); // Boss'a vurulma işlemini yap ve mermiyi kaldır
                bullets.splice(i, 1); // Diziden çıkar
                bulletHitSomething = true;
            }
        }
        if (bulletHitSomething) continue; // Mermi boss'a çarptıysa diğer düşman kontrollerini atla

        // Düşmanlarla çarpışma kontrolü
        for (let eIndex = enemies.length - 1; eIndex >= 0; eIndex--) {
            const enemy = enemies[eIndex];
            if (!enemy || !enemy.style || !enemy.parentNode) { enemies.splice(eIndex, 1); continue; } // Düşman DOM'dan kaldırıldıysa atla
            
            if (checkCollision(getRect(bullet.element), getRect(enemy))) {
                enemy.health -= 20; // Mermi hasarı
                enemy.classList.add('hit'); // Vurulma efekti
                setTimeout(() => enemy.classList.remove('hit'), 200); // Efekti kaldır
                const enemyHealthBar = enemy.querySelector('.enemy-health');
                if (enemyHealthBar) enemyHealthBar.style.width = Math.max(0, (enemy.health / 100) * 64) + "px"; // Can barını güncelle
                
                bullet.element.remove(); bullets.splice(i, 1); bulletHitSomething = true; // Mermiyi kaldır

                if (enemy.health <= 0) {
                    createExplosion(parseFloat(enemy.style.left), parseFloat(enemy.style.bottom)); // Patlama efekti
                    enemy.remove(); enemies.splice(eIndex, 1); // Düşmanı kaldır
                    score += 20; ultimateCharge += 20; // Puan ve ulti şarjı kazan
                    if (scoreboard) scoreboard.textContent = "$: " + score;
                    if (ultimateCharge >= ultimateChargeMax && !isUltimateReady) { isUltimateReady = true; console.log("ULTI HAZIR (düşman)!"); }
                    
                    // Boss aktif değilse ve yeterli düşman yoksa yeni düşman yaratmayı tetikle
                    if (!isBossActive && enemies.length < enemyMaxCount) {
                        setTimeout(createEnemy, 500 + Math.random() * 1000);
                    }
                }
                break; // Mermi bir düşmana çarptıysa diğer düşmanları kontrol etmeye gerek yok
            }
        }
        if (bulletHitSomething) continue; // Mermi bir şeye çarptıysa döngüden devam et

        // Mermi ekran dışına çıktıysa sil
        if (currentBulletX > game.clientWidth + 20 || currentBulletX < -20) {
            bullet.element.remove(); bullets.splice(i, 1);
        }
    }

    // Düşman Mermileri
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];
        if (!bullet || !bullet.element || !bullet.element.style) { enemyBullets.splice(i, 1); continue; }
        
        let currentBulletX = parseFloat(bullet.element.style.left);
        currentBulletX -= (bullet.speed || 5); // Düşman mermi hızı
        bullet.element.style.left = currentBulletX + "px";

        // Oyuncu ile çarpışma kontrolü
        if (player && checkCollision(getRect(bullet.element), getRect(player))) {
            playerHealth -= 10; // Can azalt
            player.classList.add('hit'); // Vurulma efekti
            setTimeout(() => player.classList.remove('hit'), 200); // Efekti kaldır
            if(playerHealthBar) playerHealthBar.style.width = Math.max(0, (playerHealth / 100) * 64) + "px"; // Can barını güncelle
            
            bullet.element.remove(); enemyBullets.splice(i, 1); // Mermiyi kaldır
            if (playerHealth <= 0) gameOver("Nayır nolamaz!"); // Can sıfırsa oyun biter
        }
        // Mermi ekran dışına çıktıysa sil
        if (currentBulletX < -20) { bullet.element.remove(); enemyBullets.splice(i, 1); }
    }
}

/**
 * Düşmanların pozisyonunu ve davranışlarını günceller.
 */
function updateEnemies() {
    if (!game || !player || !enemiesContainer) return;

    // Eğer boss aktifse (Sony hariç), normal düşmanları hareket ettirme veya silme
    if (isBossActive && currentBoss && currentBoss.name !== 'Sony') {
        for (let i = enemies.length - 1; i >= 0; i--) {
            if(enemies[i] && enemies[i].parentNode) enemies[i].remove();
            enemies.splice(i,1); // Diziden de kaldır
        }
        return; // Boss aktifken normal düşman güncellemesini durdur
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (!enemy || !enemy.style || !enemy.parentNode) { enemies.splice(i, 1); continue; }
        
        let x = parseFloat(enemy.style.left);
        x -= 2; // Düşman hızı (sola doğru hareket)
        enemy.style.left = x + "px";

        // Düşman ateş etme mantığı
        const playerRect = getRect(player);
        // Düşmanın ekran içinde olması ve oyuncuya belirli bir mesafede olması kontrolü
        if (x > 0 && x < game.clientWidth && Math.random() < 0.010) { // %1 ihtimalle ateş et
            if (Math.abs(x - playerRect.x) < 450 && Math.abs(x - playerRect.x) > 50) { // Oyuncuya belirli bir mesafedeyse
                shootEnemyBullet(enemy);
            }
        }
        // Düşman ekran dışına çıktıysa sil
        if (x < -(enemy.clientWidth || 64)) { enemy.remove(); enemies.splice(i, 1); }
    }
    // Yeni düşman yaratma (sadece boss aktif değilse ve düşman sayısı azsa)
    if (enemies.length < enemyMaxCount && Math.random() < 0.008 && !isBossActive) {
        createEnemy();
    }
}

/**
 * Düşmanların mermi atmasını sağlar.
 * @param {HTMLElement} enemy - Mermi atacak düşman elementi.
 */
function shootEnemyBullet(enemy) {
    if (!enemyBulletsContainer || !enemy || !enemy.style) return;
    const bullet = document.createElement("div");
    bullet.className = "enemy-bullet";
    const enemyRect = getRect(enemy);
    bullet.style.left = (enemyRect.x + enemyRect.width / 2 - 5) + "px"; // Mermi başlangıç pozisyonu
    bullet.style.bottom = (game.clientHeight - enemyRect.y - enemyRect.height / 2 - 2) + "px";
    enemyBulletsContainer.appendChild(bullet);
    enemyBullets.push({ element: bullet }); // Mermiyi düşman mermileri dizisine ekle
}

/**
 * Pizzaların pozisyonunu ve oyuncu ile çarpışmalarını günceller.
 */
function updatePizzas() {
    // Boss aktifken veya gerekli elementler yoksa güncelleme yapma
    if (isBossActive || !pizzasContainer || !player || !scoreboard || !playerHealthBar) return;
    
    for (let i = pizzas.length - 1; i >= 0; i--) {
        const pizza = pizzas[i];
        if(!pizza || !pizza.style || !pizza.parentNode) {pizzas.splice(i,1); continue;} // Element geçersizse veya kaldırılmışsa diziden çıkar
        
        let x = parseFloat(pizza.style.left);
        x -= 1.5; pizza.style.left = x + "px"; // Pizzayı hareket ettir

        // Oyuncu ile çarpışma kontrolü
        if (checkCollision(getRect(pizza), getRect(player))) {
            if (pizza.isBad) { // Kötü pizza ise can azalt
                playerHealth -= 15; if (playerHealth < 0) playerHealth = 0;
                player.classList.add('hit'); setTimeout(() => player.classList.remove('hit'), 200);
                if (playerHealth <= 0) gameOver("Bayat peksimet sağlığa zararlıdır dostum!"); // Can sıfırsa oyun biter
            } else { // İyi pizza ise can, puan ve ulti şarjı artır
                playerHealth += 10; if (playerHealth > 100) playerHealth = 100;
                score += 10; ultimateCharge += 10;
                if (ultimateCharge >= ultimateChargeMax && !isUltimateReady) { isUltimateReady = true; console.log("ULTI HAZIR (pizza)!"); }
            }
            playerHealthBar.style.width = Math.max(0, (playerHealth / 100) * 64) + "px"; // Can barını güncelle
            scoreboard.textContent = "$: " + score; // Skoru güncelle
            pizza.remove(); pizzas.splice(i, 1); // Pizzayı kaldır
        }
        // Pizza ekran dışına çıktıysa sil
        if (x < -(pizza.clientWidth || 32)) { pizza.remove(); pizzas.splice(i, 1); }
    }
    // Yeni pizza yaratma (belli bir şansa göre)
    if (pizzas.length < 3 && Math.random() < 0.006) createPizza();
    // Boss aktif değilse ve boss öldü bayrağı false ise power-up yarat (belli bir şansa göre)
    if (powerUps.length < 1 && !isBossActive && !isBossDefeated && Math.random() < 0.0035) createPowerUp();
}

/**
 * Güçlendirmelerin pozisyonunu ve oyuncu ile çarpışmalarını günceller.
 */
function updatePowerUps() {
    if (!powerupsContainer || !player) return;
    
    // Boss aktifken tüm güçlendirmeleri kaldır
    if (isBossActive) { powerUps.forEach(pu => { if(pu && pu.parentNode) pu.remove(); }); powerUps.length = 0; return; }

    for (let i = powerUps.length - 1; i >= 0; i--) {
        const powerUp = powerUps[i];
        if(!powerUp || !powerUp.style || !powerUp.parentNode) {powerUps.splice(i,1); continue;}
        
        let x = parseFloat(powerUp.style.left);
        x -= 1; powerUp.style.left = x + "px"; // Güçlendirmeyi hareket ettir

        // Oyuncu ile çarpışma kontrolü
        if (checkCollision(getRect(powerUp), getRect(player))) {
            if (powerUp.type === 'double-shot') { // Çift atış güçlendirmesi
                hasDoubleShot = true;
                if(doubleShotTimerId) clearTimeout(doubleShotTimerId); // Önceki süreyi temizle
                doubleShotTimerId = setTimeout(() => { hasDoubleShot = false; console.log("Çift ateş bitti."); }, DOUBLE_SHOT_DURATION); // Yeni süreyi başlat
                console.log("Çift ateş alındı!");
            }
            powerUp.remove(); powerUps.splice(i, 1); // Güçlendirmeyi kaldır
        }
        // Güçlendirme ekran dışına çıktıysa sil
        if (x < -(powerUp.clientWidth || 32)) { powerUp.remove(); powerUps.splice(i, 1); }
    }
}

/**
 * Oyuncunun bomba atmasını sağlar.
 */
function throwPlayerBomb() {
    // Yeterli bomba yoksa bomba atmayı engelle
    if (!player || !playerBombsContainer || playerBombCount <= 0) {
        return;
    }
    lastPlayerBombTime = Date.now(); // Bomba atıldığında cooldown süresini başlat (kazanım için)
    playerBombCount--; // Bomba sayısını azalt
    console.log(`Bomba atıldı! Kalan: ${playerBombCount}`);

    updateBombUI(); // Bomba UI'ını güncelle

    const bombElement = document.createElement("div");
    bombElement.className = "bomb player-bomb";
    let bombDirection = (player.style.transform === 'scaleX(-1)') ? -1 : 1; // Oyuncunun yönüne göre bomba yönü
    const playerRect = getRect(player); // Oyuncunun güncel pozisyonunu al
    let bombStartX = playerRect.x + (playerRect.width / 2); // Oyuncunun ortasından başlasın

    bombElement.style.left = bombStartX + "px";
    bombElement.style.bottom = (playerRect.bottomVal + playerRect.height / 2) + "px";
    
    // Bomba verilerini oluştur ve diziye ekle
    const bombData = { element: bombElement, velX: 5 * bombDirection, velY: 7, isExploding: false, damageRadius: 70, damageAmount: 50 };
    playerBombsArray.push(bombData);
    playerBombsContainer.appendChild(bombElement); // Bomba elementini DOM'a ekle
}

/**
 * Oyuncu bombalarının pozisyonlarını, yerçekimi etkilerini ve patlamalarını günceller.
 */
function updatePlayerBombs() {
    if (!game) return;
    for (let i = playerBombsArray.length - 1; i >= 0; i--) {
        const bomb = playerBombsArray[i];
        if (!bomb || !bomb.element || !bomb.element.style || !bomb.element.parentNode) { playerBombsArray.splice(i, 1); continue; }
        
        // Eğer bomba patlama animasyonunday ise, sadece DOM'dan kaldırılmasını bekle
        if (bomb.isExploding) {
            if (!bomb.element.parentNode) {
                playerBombsArray.splice(i,1); // DOM'dan kaldırıldıysa diziden çıkar
            }
            continue;
        }
        
        bomb.velY -= GRAVITY * 0.8; // Yerçekimi etkisi uygula
        let currentBombX = parseFloat(bomb.element.style.left) + bomb.velX;
        let currentBombBottom = parseFloat(bomb.element.style.bottom) + bomb.velY;
        bomb.element.style.left = currentBombX + "px";
        bomb.element.style.bottom = currentBombBottom + "px";

        // Bomba zemine değdiğinde patla
        if (currentBombBottom <= groundOffset) {
            currentBombBottom = groundOffset; bomb.element.style.bottom = currentBombBottom + "px";
            bomb.isExploding = true;
            bomb.element.classList.add('exploding'); // Patlama animasyonu sınıfını ekle
            applyScreenShake(); // Ekran sallanması efekti

            // Alan hasarı (Area of Effect - AoE)
            enemies.forEach(enemy => {
                if (!enemy || !enemy.health || enemy.health <= 0 || !enemy.parentNode) return;
                
                // Bomba ve düşman arasındaki mesafeyi hesapla
                const bombCenter = { x: currentBombX + bomb.element.clientWidth / 2, y: game.clientHeight - currentBombBottom - bomb.element.clientHeight / 2 };
                const enemyRect = getRect(enemy);
                const enemyCenter = { x: enemyRect.x + enemyRect.width / 2, y: enemyRect.y + enemyRect.height / 2 };
                const distance = Math.sqrt(Math.pow(bombCenter.x - enemyCenter.x, 2) + Math.pow(bombCenter.y - enemyCenter.y, 2));
                
                if (distance < bomb.damageRadius) { // Yarıçap içinde mi?
                    enemy.health -= bomb.damageAmount; // Hasar ver
                    enemy.classList.add('hit'); setTimeout(() => enemy.classList.remove('hit'), 200);
                    const healthBar = enemy.querySelector('.enemy-health');
                    if (healthBar) healthBar.style.width = Math.max(0, (enemy.health / 100) * 64) + "px";
                    if (enemy.health <= 0) {
                        createExplosion(parseFloat(enemy.style.left), parseFloat(enemy.style.bottom));
                        enemy.remove(); // Düşmanı DOM'dan kaldır
                        score += 20; ultimateCharge += 20;
                        if (scoreboard) scoreboard.textContent = "$: " + score;
                        if (ultimateCharge >= ultimateChargeMax && !isUltimateReady) { isUltimateReady = true; console.log("ULTI HAZIR (bomba düşman)!"); }
                        if (!isBossActive && enemies.length < enemyMaxCount) setTimeout(createEnemy, 500 + Math.random() * 1000);
                    }
                }
            });
            // Boss'a hasar
            if (currentBoss && currentBoss.element && currentBoss.health > 0) {
                const bombCenter = { x: currentBombX + bomb.element.clientWidth / 2, y: game.clientHeight - currentBombBottom - bomb.element.clientHeight / 2 };
                const bossRect = getRect(currentBoss.element);
                const bossCenter = { x: bossRect.x + bossRect.width / 2, y: bossRect.y + bossRect.height / 2 };
                const distanceToBoss = Math.sqrt(Math.pow(bombCenter.x - bossCenter.x, 2) + Math.pow(bombCenter.y - bossCenter.y, 2));
                if (distanceToBoss < bomb.damageRadius + (currentBoss.element.clientWidth / 4)) { // Boss daha büyük olduğu için yarıçapı artır
                    currentBoss.health -= bomb.damageAmount / 1.5; // Boss'a daha az hasar
                    currentBoss.element.classList.add('hit');
                    setTimeout(() => currentBoss.element.classList.remove('hit'), 200);
                    updateBossHealthBar();
                    if (currentBoss.health <= 0) {
                        handleBossHitByPlayerBullet(null); // Bomba ile öldüğü için mermi göndermiyoruz
                    }
                }
            }
            // Patlama animasyonu bitince bombayı kaldır
            setTimeout(() => { if(bomb.element.parentNode) bomb.element.remove(); }, 500); // CSS animasyonu süresi
        }
        // Bomba ekran dışına çıktıysa sil
        if (currentBombX < -32 || currentBombX > game.clientWidth + 32) { // 32 bomba genişliği
            if(bomb.element.parentNode) bomb.element.remove(); playerBombsArray.splice(i, 1);
        }
    }
    // Bomba UI güncellemelerini döngünün sonunda yap (her karede)
    updateBombUI();
}

/**
 * Bomba sayısını ve bekleme süresi çubuğunu günceller.
 * Cooldown dolduğunda otomatik olarak yeni bomba verir.
 */
function updateBombUI() {
    if (!bombCountElement || !bombCooldownProgressBar) return;

    bombCountElement.textContent = `X${playerBombCount}`; // Kalan bomba sayısını göster

    const timeSinceLastBomb = Date.now() - lastPlayerBombTime;
    let cooldownProgress = 0;

    // Eğer oyuncunun maksimum bomba sayısı henüz dolmadıysa (MAX_BOMBS'tan azsa)
    if (playerBombCount < MAX_BOMBS) {
        if (timeSinceLastBomb < playerBombCooldown) {
            // Cooldown hala devam ediyor, çubuğu doldur
            cooldownProgress = (timeSinceLastBomb / playerBombCooldown) * 100;
            bombCooldownProgressBar.style.width = cooldownProgress + "%";
            bombCooldownProgressBar.style.backgroundColor = '#ff8c00'; // Cooldown devam ederken turuncu
        } else {
            // Cooldown doldu, yeni bomba verilebilir
            playerBombCount++; // Yeni bomba verildi
            lastPlayerBombTime = Date.now(); // Cooldown'ı sıfırla, bir sonraki bomba için süreyi başlat
            
            // Yeni bomba verildiğinde veya maksimum bombaya ulaşıldığında çubuğu sıfırla
            bombCooldownProgressBar.style.width = "0%";
            // Eğer yeni bomba verildikten sonra hala maksimuma ulaşılmadıysa, yeni bir cooldown başlar
            if (playerBombCount < MAX_BOMBS) {
                bombCooldownProgressBar.style.backgroundColor = '#ff8c00'; // Yeni cooldown için rengi tekrar turuncu yap
            } else {
                // Maksimum bombaya ulaşıldı, çubuğu pasif hale getir
                bombCooldownProgressBar.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
            }
        }
    } else {
        // Maksimum bomba sayısına ulaşıldı, çubuğu sıfırda tut ve pasif renk ver
        bombCooldownProgressBar.style.width = "0%";
        bombCooldownProgressBar.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'; // Hazır olduğunda gri
    }
}


/**
 * Ulti yeteneğini aktive eder.
 * Ekran efekti uygular ve tüm düşmanlara büyük hasar verir.
 */
function activateUltimate() {
    if (!isUltimateReady || !game || !ultimateVisualEffectElement) return;
    console.log("ULTI AKTİF!");
    isUltimateReady = false; ultimateCharge = 0; // Şarjı sıfırla

    ultimateVisualEffectElement.classList.add('active'); // Ulti görsel efekti
    setTimeout(() => ultimateVisualEffectElement.classList.remove('active'), 600);
    applyScreenShake(); // Ekran sallanması

    const ultimateDamage = 75;
    // Normal düşmanlara hasar ver
    enemies.forEach(enemy => {
        if (!enemy || !enemy.health || enemy.health <=0 || !enemy.parentNode) return;
        enemy.health -= ultimateDamage; enemy.classList.add('hit'); setTimeout(() => enemy.classList.remove('hit'), 200);
        const healthBar = enemy.querySelector('.enemy-health');
        if (healthBar) healthBar.style.width = Math.max(0, (enemy.health / 100) * 64) + "px";
        if (enemy.health <= 0) {
            createExplosion(parseFloat(enemy.style.left), parseFloat(enemy.style.bottom));
            enemy.remove();
            score += 20; // Ulti ile öldürülen her düşman için puan
            if (!isBossActive && enemies.length < enemyMaxCount) setTimeout(createEnemy, 500 + Math.random() * 1000);
        }
    });
    // Boss'a hasar ver
    if (currentBoss && currentBoss.element && currentBoss.health > 0) {
        currentBoss.health -= ultimateDamage * 1.5; // Boss'a daha fazla hasar
        currentBoss.element.classList.add('hit');
        setTimeout(() => currentBoss.element.classList.remove('hit'), 200);
        updateBossHealthBar();
        if (currentBoss.health <= 0) {
            handleBossHitByPlayerBullet(null); // Ulti ile öldüğü için mermi göndermiyoruz
        }
    }
}

/**
 * Oyun arka planını yatayda kaydırır. Boss aktifken durur.
 */
function scrollBackground() {
    if (game && !isBossActive) {
        const bgX = parseFloat(game.style.backgroundPositionX || 0);
        game.style.backgroundPositionX = (bgX - 0.5) + "px";
    }
}

/**
 * Belirtilen koordinatlarda bir patlama efekti oluşturur.
 * @param {number} x - Patlamanın yatay pozisyonu.
 * @param {number} y - Patlamanın dikey pozisyonu.
 */
function createExplosion(x,y) { if(!game) return; const e = document.createElement('div'); e.className = 'explosion'; e.style.left=x+'px'; e.style.bottom=y+'px'; game.appendChild(e); setTimeout(()=>e.remove(),500); }

/**
 * Belirtilen koordinatlarda küçük bir parçacık efekti oluşturur.
 * @param {number} x - Parçacığın yatay pozisyonu.
 * @param {number} y - Parçacığın dikey pozisyonu.
 */
function createParticle(x,y) { if(!game) return; const p = document.createElement('div'); p.className = 'particle'; p.style.left=x+'px'; p.style.bottom=y+'px'; p.style.opacity=1; game.appendChild(p); setTimeout(()=>p.remove(),500); }

/**
 * Yağmur damlası objesi oluşturur ve `raindrops` dizisine ekler.
 */
function createRaindrop() {
    if(!gameCanvas) return;
    raindrops.push({
        x: Math.random() * gameCanvas.width, // Rastgele yatay pozisyon
        y: -10, // Ekranın üstünden başlar
        len: Math.random() * 20 + 10, // Rastgele uzunluk
        speed: Math.random() * 5 + 2, // Rastgele hız
        width: Math.random() * 1.5 + 0.5 // Rastgele kalınlık
    });
}

/**
 * Yağmur efektini canvas üzerinde çizer ve günceller.
 */
function drawRain() {
    if (!ctx || !gameCanvas) return;
    ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height); // Canvas'ı temizle
    ctx.strokeStyle = 'rgba(173, 216, 230, 0.6)'; // Açık mavi yağmur rengi
    ctx.lineWidth = 1; // Çizgi kalınlığı

    for (let i = raindrops.length - 1; i >= 0; i--) {
        const drop = raindrops[i];
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x + drop.width, drop.y + drop.len); // Hafif açılı çizgi
        ctx.stroke();

        drop.y += drop.speed; // Damlayı aşağı hareket ettir
        if (drop.y > gameCanvas.height + 20) {
            raindrops.splice(i, 1); // Ekran dışına çıkan damlaları sil
        }
    }
    // Yeni yağmur damlaları oluştur (belli bir şansa göre)
    if (raindrops.length < maxRaindrops && Math.random() < 0.5) {
        createRaindrop();
    }
}

/**
 * Ekranda bir mesaj gösterir, isteğe bağlı olarak "Yeniden Başla" butonu ekler.
 * @param {string} msg - Gösterilecek mesaj.
 * @param {boolean} isFinal - Mesajın bir "Game Over" veya bitiş mesajı olup olmadığı. True ise restart butonu eklenir.
 */
function showMessage(msg, isFinal = false) {
    if (!messageElement) return;
    messageElement.textContent = msg;
    messageElement.style.display = 'block'; // Mesaj kutusunu görünür yap
    if (isFinal) {
        const restartButton = document.createElement('button');
        restartButton.id = 'restartButton';
        restartButton.textContent = 'YENİDEN BAŞLA';
        messageElement.appendChild(restartButton);
        restartButton.addEventListener('click', restartGame); // Yeniden başla butonuna event listener ekle
    }
}

/**
 * Ekranda gösterilen mesajı ve "Yeniden Başla" butonunu gizler.
 */
function hideMessage() {
    if (messageElement) {
        messageElement.style.display = 'none'; // Mesaj kutusunu gizle
        const restartButton = messageElement.querySelector('#restartButton');
        if (restartButton) {
            restartButton.removeEventListener('click', restartGame); // Event listener'ı kaldır
            restartButton.remove(); // Butonu DOM'dan kaldır
        }
    }
}

/**
 * Oyunu bitirir ve "Game Over" mesajını gösterir.
 * @param {string} reason - Oyunun bitme sebebi.
 */
function gameOver(reason) {
    if (isGameOver) return; // Oyun zaten bitmişse tekrar tetikleme
    isGameOver = true;
    cancelAnimationFrame(animationFrameId); // Oyun döngüsünü durdur
    gameMusic.pause(); // Müziği durdur
    gameMusic.currentTime = 0; // Müziği başa sar
    showMessage(reason + "\nGAME OVER!", true); // Game Over mesajını göster
}

/**
 * Boss'un oyuncu mermisiyle vurulma durumunu işler.
 * @param {HTMLElement} bulletElement - Boss'a çarpan mermi elementi (null olabilir).
 */
function handleBossHitByPlayerBullet(bulletElement) {
    if (!currentBoss || !currentBoss.element || currentBoss.health <= 0) return;
    
    // Mermiyi DOM'dan kaldır
    if (bulletElement && bulletElement.parentNode) {
        bulletElement.remove();
    }

    currentBoss.health -= 20; // Normal mermi hasarı (ulti veya bomba vurursa bu kısım null gelir, hasar ayrı işlenir)
    currentBoss.element.classList.add('hit'); // Vurulma efekti
    setTimeout(() => currentBoss.element.classList.remove('hit'), 200);
    updateBossHealthBar(); // Can barını güncelle

    if (currentBoss.health <= 0) {
        currentBoss.health = 0; // Canın negatif olmamasını sağla
        console.log(`${currentBoss.name} yenildi!`);
        isBossActive = false;
        isBossDefeated = true; // Boss'un yenildiğini işaretle
        createExplosion(parseFloat(currentBoss.element.style.left), parseFloat(currentBoss.element.style.bottom)); // Patlama efekti
        currentBoss.element.remove(); // Boss elementini kaldır
        currentBoss = null; // Boss referansını sıfırla
        score += 500; // Boss yenilgi puanı
        if (scoreboard) scoreboard.textContent = "$: " + score;
        
        // Oyun aşamasını ilerlet
        if (gameStage === 1) { // Diaz yenildi
            gameStage = 2;
            enemyImage = 'enemy_gangster.png'; // Yeni düşman resmi
            enemyMaxCount = 4; // Yeni düşman limiti
            changeBackground('background2.png'); // Yeni arka plan
            showMessage("İlk boss gitti Alpış! Ama macera devam ediyor", false); // Geçici mesaj
            setTimeout(hideMessage, 3000);
        } else if (gameStage === 2) { // Lance yenildi
            gameStage = 3;
            enemyImage = 'enemy_cop.png'; // Yeni düşman resmi
            enemyMaxCount = 5; // Yeni düşman limiti
            changeBackground('background3.png'); // Yeni arka plan
            showMessage("İkinci boss da gitti, yüzüğü yok etmene az kaldı bay Alpış! Ha gayret!", false);
            setTimeout(hideMessage, 3000);
        } else if (gameStage === 3) { // Sony yenildi
            gameStage = 4; // Oyun bitiş aşaması (veya yeni bir stage olabilir)
            gameOver("En küçük insan bile geleceğin gidişatını değiştirebilir. Tebrikler bay Alpış!"); // Oyunu bitir
        }
        // Boss yenildikten sonra normal akışa dönmesi için küçük bir gecikme
        setTimeout(() => {
            if (enemies.length < enemyMaxCount) createEnemy();
            if (pizzas.length < 3) createPizza();
            if (powerUps.length < 1) createPowerUp();
        }, 1000); // 1 saniye sonra normal akışa dön
    }
}

// --- Event Dinleyicileri ---

// Klavye tuş basımlarını dinle
document.addEventListener("keydown", (e) => {
    keys[e.key.toLowerCase()] = true; // Basılan tuşu true olarak işaretle
    if (e.key.toLowerCase() === "j" && !jKeyHeld) { // 'j' tuşu basıldığında (tekrar tetiklemeyi önlemek için jKeyHeld kontrolü)
        shootBullet();
        jKeyHeld = true; // Tuşa basılı tutma durumunu işaretle
    }
    if (e.key.toLowerCase() === "k") { // 'k' tuşu bomba için
        throwPlayerBomb();
    }
    if (e.key.toLowerCase() === "l") { // 'l' tuşu ultimate için
        activateUltimate();
    }
});

// Klavye tuş bırakmalarını dinle
document.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false; // Bırakılan tuşu false olarak işaretle
    if (e.key.toLowerCase() === "j") {
        jKeyHeld = false; // Tuş serbest bırakıldığında durumu sıfırla
    }
});

// Başlangıç butonu tıklama olayını dinle
startButton.addEventListener('click', () => {
    startScreen.style.display = 'none'; // Başlangıç ekranını gizle
    game.style.display = 'block'; // Oyun alanını göster
    initGame(); // Oyunu başlat
    gameMusic.play().catch(e => console.log("Müzik çalma hatası:", e)); // Otomatik oynatma hatasını yakala
});

// --- Oyun Döngüsü ---

/**
 * Oyunun ana döngüsü. Her karede oyun durumunu günceller ve çizimleri yapar.
 */
function gameLoop() {
    if (isGameOver) return; // Oyun bittiyse döngüyü durdur

    // Tüm oyun öğelerini güncelle
    updatePlayer();
    updateBullets();
    updateEnemies();
    updatePizzas();
    updatePowerUps();
    updatePlayerBombs(); // Oyuncu bombalarını güncelle

    // Arka planı kaydır
    scrollBackground();

    // Yağmur efektini çiz (eğer canvas varsa)
    if (gameCanvas) {
        drawRain();
    }

    // Boss tetikleme ve güncelleme
    if (!isBossActive) { // Boss aktif değilse yeni boss'u tetikleme kontrolü yap
        if (score >= SONY_TRIGGER_SCORE && gameStage === 3) {
            createBoss('Sony');
            changeBackground('background_sony.png'); // Sony boss için özel arka plan
        } else if (score >= LANCE_TRIGGER_SCORE && gameStage === 2) {
            createBoss('Lance');
            changeBackground('background_lance.png'); // Lance boss için özel arka plan
        } else if (score >= DIAZ_TRIGGER_SCORE && gameStage === 1) {
            createBoss('Diaz');
            changeBackground('background_diaz.png'); // Diaz boss için özel arka plan
        }
    } else { // Boss aktifse davranışını güncelle
        if (currentBoss && currentBoss.element) {
            const bossRect = getRect(currentBoss.element);
            let bossX = bossRect.leftVal;
            // Boss ekrana girmeden önce hareket etsin (ekranın sağ kenarına 100px kala dur)
            if (bossX > game.clientWidth - currentBoss.element.clientWidth - 100) {
                bossX -= 2; // Boss giriş hızı
                currentBoss.element.style.left = bossX + "px";
            } else {
                // Boss durduktan sonra saldırı yapsın
                const now = Date.now();
                if (now - currentBoss.lastAttackTime > currentBoss.attackCooldown) {
                    if (currentBoss.name === 'Diaz') {
                        shootBossBullet(currentBoss);
                        currentBoss.attackCooldown = 800 + Math.random() * 500; // Rastgele bekleme
                    } else if (currentBoss.name === 'Lance') {
                        throwBossBomb(currentBoss);
                        shootBossBullet(currentBoss); // Aynı anda mermi de atabilir
                        currentBoss.attackCooldown = 1200 + Math.random() * 800;
                    } else if (currentBoss.name === 'Sony') {
                        // Sony'nin özel saldırı paterni (daha sık mermi, bazen bomba)
                        if (Math.random() < 0.7) shootBossBullet(currentBoss);
                        else throwBossBomb(currentBoss);
                        currentBoss.attackCooldown = 600 + Math.random() * 400;
                        // Sony boss aktifken normal düşmanları da yaratmaya devam edebilir
                        if (enemies.length < enemyMaxCount && Math.random() < 0.015) {
                            createEnemy();
                        }
                    }
                    currentBoss.lastAttackTime = now;
                }
            }
        }
    }

    animationFrameId = requestAnimationFrame(gameLoop); // Döngüyü tekrarla
}

/**
 * Yağmur kanvasını başlatır ve gerekli bağlamı ayarlar.
 */
function initRainCanvas() {
    gameCanvas = document.createElement('canvas');
    gameCanvas.id = 'rainCanvas';
    gameCanvas.width = game.clientWidth; // Oyun alanının genişliği
    gameCanvas.height = game.clientHeight; // Oyun alanının yüksekliği
    game.appendChild(gameCanvas);
    ctx = gameCanvas.getContext('2d'); // 2D çizim bağlamı
    raindrops = [];
    maxRaindrops = 100; // Ekrandaki maksimum yağmur damlası sayısı
    // Başlangıçta tüm damlaları oluşturmayı kaldırdık, artık drawRain() fonksiyonu zamanla dolduracak.
    // for (let i = 0; i < maxRaindrops; i++) {
    //     createRaindrop();
    // }
}

// --- Oyun Başlangıç ve Yeniden Başlatma Fonksiyonları ---

/**
 * Oyunun tüm değişkenlerini sıfırlar, elementlerini temizler ve oyunu başlatır.
 */
function initGame() {
    hideMessage(); // Mesajı ve yeniden başla butonunu gizle!

    // Oyun değişkenlerini sıfırla
    playerX = 50;
    playerY = 0;
    playerVelX = 0;
    playerVelY = 0;
    playerAccX = 0;
    isJumping = false;

    bullets = [];
    enemyBullets = [];
    enemies = [];
    pizzas = [];
    bombs = []; // Boss bombaları için
    playerBombsArray = []; // Oyuncu bombaları için
    powerUps = [];

    score = 0;
    playerHealth = 100;
    isGameOver = false;

    // Bomba değişkenlerini sıfırla/başlat
    playerBombCount = MAX_BOMBS; // Başlangıçta tam bomba sayısı
    lastPlayerBombTime = Date.now() - playerBombCooldown; // İlk bombanın hemen atılabilir olmasını sağlar

    // Ultimate değişkenlerini sıfırla
    ultimateCharge = 0;
    ultimateChargeMax = 200; // Ultimate için gereken puan
    isUltimateReady = false;

    // Boss değişkenlerini sıfırla
    currentBoss = null;
    isBossActive = false;
    isBossDefeated = false;

    // Oyun aşamasını başlat
    gameStage = 1; // Başlangıç aşaması (Diaz öncesi)
    enemyImage = 'enemy.png'; // Varsayılan düşman resmi
    enemyMaxCount = 3; // Varsayılan düşman sayısı

    // UI güncellemeleri
    if (scoreboard) scoreboard.textContent = "$: " + score;
    if (playerHealthBar) playerHealthBar.style.width = "64px"; // Can barını tam yap
    if (weaponIconElement) weaponIconElement.src = 'pistol.png'; // Silah ikonunu sıfırla

    // Player pozisyonunu sıfırla ve varsayılan durumuna getir
    if (player) {
        player.style.left = playerX + "px";
        player.style.bottom = groundOffset + playerY + "px";
        player.style.backgroundImage = "url('player.png')"; // Oyuncu resmini varsayılana döndür
        player.classList.remove('hit', 'running'); // Olası animasyon sınıflarını kaldır
        player.style.transform = 'scaleX(1)'; // Yönü sıfırla
    }

    // Tüm eski düşmanları, mermileri, pizzaları, bombaları ve güçlendirmeleri DOM'dan temizle
    [bulletsContainer, enemyBulletsContainer, enemiesContainer, pizzasContainer, playerBombsContainer, powerupsContainer].forEach(container => {
        if (container) {
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }
        }
    });

    // Arka planı sıfırla
    changeBackground('background.png');

    // Yağmur kanvasını başlat (eğer henüz yoksa)
    if (!gameCanvas) {
        initRainCanvas();
    }
    // Yağmur damlalarını sıfırla ve yeniden oluştur (artık initRainCanvas'ta tamamen oluşturulmuyor)
    raindrops = [];
    // Bu kısım boş bırakıldı, drawRain() zamanla damlaları yaratacak.
    // for (let i = 0; i < maxRaindrops; i++) {
    //     createRaindrop();
    // }

    // İlk düşmanları ve pizzaları yarat
    for(let i = 0; i < enemyMaxCount; i++) {
        createEnemy();
    }
    createPizza();

    // Bomba UI'ı başlangıçta güncelle
    updateBombUI();

    // Oyun döngüsünü başlat (önceki varsa iptal et)
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    animationFrameId = requestAnimationFrame(gameLoop);
}

/**
 * Oyunu yeniden başlatır. `gameOver` tarafından eklenen butondan çağrılır.
 */
function restartGame() {
    // `gameOver` fonksiyonu tarafından eklenen yeniden başlatma butonunu kaldır
    const restartButton = document.getElementById('restartButton');
    if (restartButton) {
        restartButton.removeEventListener('click', restartGame); // Event listener'ı kaldır
        restartButton.parentNode.removeChild(restartButton); // Butonu DOM'dan kaldır
    }
    
    initGame(); // Oyunu yeniden başlat
    gameMusic.play().catch(e => console.log("Müzik çalma hatası:", e)); // Müziği tekrar çalmayı dene
}

// Sayfa tamamen yüklendiğinde başlangıç ekranını göster
document.addEventListener('DOMContentLoaded', () => {
    // Oyun alanını başlangıçta gizle
    if (game) game.style.display = 'none';
    // Başlangıç ekranını göster
    if (startScreen) startScreen.style.display = 'flex';
    console.log("DOM içeriği yüklendi.");
});

// --- MOBİL KONTROLLER BAŞLANGICI ---

// HTML element referanslarını al
const btnLeft = document.getElementById("btn-left");
const btnRight = document.getElementById("btn-right");
const btnJump = document.getElementById("btn-jump");
const btnShoot = document.getElementById("btn-shoot");
const btnBomb = document.getElementById("btn-bomb");
const btnUltimate = document.getElementById("btn-ultimate");

// Tuş eşleştirmeleri (Mevcut klavye tuşlarına karşılık gelir)
const controlMappings = {
    "btn-left": "a",
    "btn-right": "d",
    "btn-jump": " ", // Zıplama
    "btn-shoot": "j", // Ateş etme
    "btn-bomb": "k",  // Bomba atma
    "btn-ultimate": "l" // Ulti kullanma
};

/**
 * Kontrol butonlarına basıldığında veya bırakıldığında klavye olaylarını simüle eder.
 * @param {string} keyName - Simüle edilecek tuşun adı (keys objesindeki karşılığı).
 * @param {boolean} isPressed - Tuşun basılıp basılmadığı.
 */
function handleControlInput(keyName, isPressed) {
    if (isPressed) {
        keys[keyName] = true;
        
        // Ateş (J), Bomba (K) ve Ulti (L) için anlık aksiyonu tetikle
        if (keyName === 'j') {
            // jKeyHeld kontrolü sayesinde tek basışta bir kere ateş edilir
            if (!jKeyHeld) { 
                 jKeyHeld = true; 
                 shootBullet(); // Mevcut ateş fonksiyonunuzu çağırır
            }
        } else if (keyName === 'k') {
             // Bomba atma fonksiyonu (Varsayılır ki tanımlı)
            if (playerBombCount > 0) { // Bomba sayısını kontrol et
                 throwPlayerBomb(); 
            }
        } else if (keyName === 'l') {
             // Ulti kullanma fonksiyonu (Varsayılır ki tanımlı)
            useUltimate(); 
        }

    } else {
        // Tuş bırakıldığında keys nesnesinden sil
        delete keys[keyName];
        if (keyName === 'j') jKeyHeld = false; // Ateş tuşunu bırakıldı olarak işaretle
    }
}

// Tüm butonlara mouse ve dokunmatik olay dinleyicilerini ekle
[btnLeft, btnRight, btnJump, btnShoot, btnBomb, btnUltimate].forEach(button => {
    if (!button) return; // Buton HTML'de yoksa atla
    const keyName = controlMappings[button.id];

    // Basma olayları (mousedown ve touchstart)
    const pressHandler = (e) => {
        e.preventDefault(); // Gecikmeleri ve varsayılan davranışı (kaydırma vb.) engelle
        handleControlInput(keyName, true);
    };

    // Bırakma olayları (mouseup ve touchend/touchcancel)
    const releaseHandler = (e) => {
        e.preventDefault();
        handleControlInput(keyName, false);
    };

    button.addEventListener('mousedown', pressHandler);
    button.addEventListener('touchstart', pressHandler, { passive: false });

    button.addEventListener('mouseup', releaseHandler);
    button.addEventListener('touchend', releaseHandler, { passive: false });
    button.addEventListener('touchcancel', releaseHandler, { passive: false });
});

// --- MOBİL KONTROLLER SONU ---