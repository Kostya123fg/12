// ========== КОНФИГУРАЦИЯ API ==========
const urlParams = new URLSearchParams(window.location.search);
const serverFromUrl = urlParams.get('server');

let API_BASE = serverFromUrl || '';  // Пустая строка для относительных путей
let currentLang = 'ru';

console.log('🔗 API_BASE:', API_BASE || 'relative paths');

// ========== ИНИЦИАЛИЗАЦИЯ TELEGRAM WEBAPP ==========
let tg = window.Telegram.WebApp;
tg.expand();

// Получаем user_id из Telegram
let userId = null;
try {
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        userId = tg.initDataUnsafe.user.id;
        console.log('Telegram User ID:', userId);
    } else {
        console.warn('Не удалось получить user_id из Telegram WebApp');
    }
} catch (e) {
    console.error('Ошибка получения user_id:', e);
}

// ========== DOM ЭЛЕМЕНТЫ ==========
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadPrompt = document.getElementById('uploadPrompt');
const imagePreview = document.getElementById('imagePreview');
const previewImg = document.getElementById('previewImg');
const analyzeBtn = document.getElementById('analyzeBtn');
const changeImageBtn = document.getElementById('changeImageBtn');
const btnText = document.getElementById('btnText');
const btnSpinner = document.getElementById('btnSpinner');
const resultsSection = document.getElementById('resultsSection');
const confidenceValue = document.getElementById('confidenceValue');
const signalValue = document.getElementById('signalValue');
const eventStats = document.getElementById('eventStats');
const analyticsText = document.getElementById('analyticsText');
const errorArea = document.getElementById('errorArea');
const errorText = document.getElementById('errorText');
const attemptsCounter = document.getElementById('attemptsCounter');
const attemptsCounterMain = document.getElementById('attemptsCounterMain');
const attemptsInfo = document.getElementById('attemptsInfo');

let selectedFile = null;

// ========== ПЕРЕКЛЮЧЕНИЕ ЯЗЫКА ==========
const currentLangBtn = document.getElementById('currentLang');
const langDropdown = document.getElementById('langDropdown');
const langFlag = document.getElementById('langFlag');
const langCode = document.getElementById('langCode');

// Toggle dropdown
currentLangBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    langDropdown.classList.toggle('show');
});

// Close dropdown when clicking outside
document.addEventListener('click', () => {
    langDropdown.classList.remove('show');
});

// Language selection
document.querySelectorAll('.language-option').forEach(option => {
    option.addEventListener('click', (e) => {
        e.stopPropagation();
        const lang = option.dataset.lang;
        changeLanguage(lang);
        langDropdown.classList.remove('show');
    });
});

function changeLanguage(lang) {
    currentLang = lang;
    const l = languages[lang];
    
    // Update language selector
    langFlag.textContent = l.flag;
    langCode.textContent = l.code;
    
    // Update page content
    document.querySelector('h1').textContent = l.title;
    document.querySelector('.text-gray-300.text-sm').textContent = l.category;
    
    // Update upload area
    const uploadTexts = document.querySelectorAll('.upload-container p');
    if (uploadTexts.length >= 2) {
        uploadTexts[0].textContent = l.upload;
        uploadTexts[1].textContent = l.uploadHint;
    }
    
    // Update change image button
    if (changeImageBtn) {
        changeImageBtn.textContent = l.changeImage;
    }
    
    // Update analyze button
    if (btnText && !analyzeBtn.disabled) {
        btnText.textContent = l.analyzeBtn;
    }
    
    // Update labels if results are visible
    const labels = document.querySelectorAll('.text-gray-400.text-xs');
    if (labels.length >= 3 && !resultsSection.classList.contains('hidden')) {
        labels[0].textContent = l.confidenceLabel;
        labels[1].textContent = l.signalLabel;
        labels[2].textContent = l.eventsLabel;
    }
    
    // Update analytics label
    const analyticsLabel = document.querySelector('#analyticsText')?.previousElementSibling?.querySelector('h3');
    if (analyticsLabel) {
        analyticsLabel.textContent = l.analyticsLabel;
    }
    
    // Save language preference
    localStorage.setItem('selectedLang', lang);
}

// Load saved language
const savedLang = localStorage.getItem('selectedLang');
if (savedLang && languages[savedLang]) {
    changeLanguage(savedLang);
}

// ========== ИНИЦИАЛИЗАЦИЯ ПОПЫТОК ==========
async function initAttempts() {
    try {
        console.log('🔄 Загрузка попыток...', {userId, API_BASE});
        
        if (!API_BASE || API_BASE === '') {
            console.warn('⚠️ API_BASE пустой, показываем дефолтные значения');
            updateAttemptsDisplay({
                remaining: 5,
                total: 5,
                unlimited: false
            });
            return;
        }
        
        const url = userId ? `/attempts?user_id=${userId}` : '/attempts';
        console.log('📡 Запрос:', `${API_BASE}${url}`);
        
        const response = await fetch(`${API_BASE}${url}`);
        const data = await response.json();
        
        console.log('✅ Ответ от сервера:', data);
        
        if (data.success) {
            updateAttemptsDisplay(data.attempts);
        } else {
            console.warn('⚠️ Сервер вернул ошибку');
            updateAttemptsDisplay({
                remaining: 5,
                total: 5,
                unlimited: false
            });
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки попыток:', error);
        // Показываем дефолтное значение вместо прочерков
        updateAttemptsDisplay({
            remaining: 5,
            total: 5,
            unlimited: false
        });
    }
}

// ========== ОБНОВЛЕНИЕ СЧЕТЧИКА ПОПЫТОК ==========
function updateAttemptsDisplay(attemptsData) {
    const remaining = attemptsData.remaining;
    const total = attemptsData.total;
    const unlimited = attemptsData.unlimited || false;
    
    const l = languages[currentLang];
    
    // Если безлимит - показываем "Безлимит"
    if (unlimited || remaining === -1) {
        const counterText = l.unlimited;
        attemptsCounter.textContent = counterText;
        attemptsCounterMain.textContent = counterText;
        
        // Золотой цвет для безлимита
        attemptsCounter.classList.add('text-yellow-400');
        attemptsCounter.classList.remove('text-red-400', 'text-white');
        attemptsCounterMain.classList.add('text-yellow-400');
        attemptsCounterMain.classList.remove('text-red-400', 'text-emerald-400');
        
        return -1;
    }
    
    const counterText = `${remaining} / ${total}`;
    
    attemptsCounter.textContent = counterText;
    attemptsCounterMain.textContent = counterText;
    
    // Меняем цвет в зависимости от остатка
    if (remaining <= 2) {
        attemptsCounter.classList.add('text-red-400');
        attemptsCounter.classList.remove('text-yellow-400', 'text-white');
        attemptsCounterMain.classList.add('text-red-400');
        attemptsCounterMain.classList.remove('text-yellow-400', 'text-emerald-400');
    } else if (remaining <= 5) {
        attemptsCounter.classList.add('text-yellow-400');
        attemptsCounter.classList.remove('text-red-400', 'text-white');
        attemptsCounterMain.classList.add('text-yellow-400');
        attemptsCounterMain.classList.remove('text-red-400', 'text-emerald-400');
    } else {
        attemptsCounter.classList.add('text-white');
        attemptsCounter.classList.remove('text-red-400', 'text-yellow-400');
        attemptsCounterMain.classList.add('text-emerald-400');
        attemptsCounterMain.classList.remove('text-red-400', 'text-yellow-400');
    }
    
    return remaining;
}

// ========== ЗАГРУЗКА ФАЙЛА ==========
uploadArea.addEventListener('click', () => {
    if (!selectedFile) {
        fileInput.click();
    }
});

fileInput.addEventListener('change', (e) => {
    handleFile(e.target.files[0]);
});

changeImageBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    resetUI();
});

// Paste from clipboard
document.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (items) {
        for (let item of items) {
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                handleFile(file);
                break;
            }
        }
    }
});

// Drag and drop
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
    }
});

function resetUI() {
    selectedFile = null;
    fileInput.value = '';
    uploadPrompt.classList.remove('hidden');
    imagePreview.classList.add('hidden');
    analyzeBtn.classList.add('hidden');
    attemptsInfo.classList.add('hidden');
    resultsSection.classList.add('hidden');
    errorArea.classList.add('hidden');
}

async function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) {
        showError('Пожалуйста, выберите изображение');
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        showError('Размер файла не должен превышать 10MB');
        return;
    }

    selectedFile = file;
    const reader = new FileReader();
    reader.onload = async (e) => {
        previewImg.src = e.target.result;
        uploadPrompt.classList.add('hidden');
        imagePreview.classList.remove('hidden');
        analyzeBtn.classList.remove('hidden');
        resultsSection.classList.add('hidden');
        errorArea.classList.add('hidden');
        
        // Загружаем актуальные данные о попытках перед показом счетчика
        await initAttempts();
        attemptsInfo.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

// ========== АНАЛИЗ ==========
analyzeBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    const l = languages[currentLang];
    
    // Show loading state
    analyzeBtn.disabled = true;
    btnText.textContent = l.analyzing;
    btnSpinner.classList.remove('hidden');
    resultsSection.classList.add('hidden');
    errorArea.classList.add('hidden');

    const formData = new FormData();
    formData.append('image', selectedFile);
    if (userId) {
        formData.append('user_id', userId);
    }

    try {
        const response = await fetch(`${API_BASE}/analyze`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.status === 429) {
            if (data.attempts) {
                updateAttemptsDisplay(data.attempts);
            }
            showError(
                data.error || 'Вы исчерпали все попытки на сегодня!',
                data.purchase_url,
                data.purchase_text
            );
            return;
        }

        if (data.success) {
            if (data.attempts) {
                const remaining = updateAttemptsDisplay(data.attempts);
                
                if (remaining === 0) {
                    setTimeout(() => {
                        showError('Это была ваша последняя попытка на сегодня!');
                    }, 1000);
                }
            }
            
            displayResults(data);
            resultsSection.classList.remove('hidden');
        } else {
            showError(data.error || 'Произошла ошибка при анализе');
        }
    } catch (error) {
        showError('Ошибка подключения к серверу: ' + error.message);
    } finally {
        analyzeBtn.disabled = false;
        btnText.textContent = l.analyzeBtn;
        btnSpinner.classList.add('hidden');
    }
});

// ========== ОТОБРАЖЕНИЕ РЕЗУЛЬТАТОВ ==========
function displayResults(data) {
    const confidence = data.confidence || 70;
    const recommendedBet = data.recommended_bet || 'Анализ';
    const analysisText = data.analysis || data.description || '';
    
    confidenceValue.textContent = confidence + '%';
    signalValue.textContent = recommendedBet;
    
    const baseConfidence = confidence;
    const stats = [
        { label: recommendedBet, percent: baseConfidence },
        { label: 'Тотал > 2.5', percent: Math.max(40, 100 - baseConfidence - 5) },
        { label: 'Тотал < 3.5', percent: Math.max(45, baseConfidence - 18) },
        { label: 'Обе забьют? Да', percent: Math.max(50, baseConfidence - 10) }
    ];
    
    eventStats.innerHTML = stats.map(stat => `
        <div class="flex items-center justify-between">
            <span class="text-gray-300 text-xs flex-1">${stat.label}</span>
            <div class="flex items-center gap-2 flex-1">
                <div class="progress-bar flex-1">
                    <div class="progress-fill" style="width: ${stat.percent}%"></div>
                </div>
                <span class="text-white text-xs font-bold w-8 text-right">${stat.percent}%</span>
            </div>
        </div>
    `).join('');
    
    let formatted = analysisText
        .replace(/\\n\\n/g, '<br><br>')
        .replace(/\\n/g, '<br>')
        .replace(/\n\n/g, '<br><br>')
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    analyticsText.innerHTML = formatted;
}

// ========== ОШИБКИ ==========
function showError(message, purchaseUrl = null, purchaseText = null) {
    errorText.innerHTML = '';
    
    const messageDiv = document.createElement('div');
    messageDiv.textContent = message;
    messageDiv.className = 'mb-3';
    errorText.appendChild(messageDiv);
    
    if (purchaseUrl && purchaseText) {
        const purchaseBtn = document.createElement('a');
        purchaseBtn.href = purchaseUrl;
        purchaseBtn.target = '_blank';
        purchaseBtn.className = 'inline-block bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors mt-2';
        purchaseBtn.textContent = purchaseText;
        errorText.appendChild(purchaseBtn);
    }
    
    errorArea.classList.remove('hidden');
    
    if (!purchaseUrl) {
        setTimeout(() => {
            errorArea.classList.add('hidden');
        }, 5000);
    }
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
// Вызываем после полной загрузки страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 Страница загружена, инициализация...');
    initAttempts();
});

// Также вызываем сразу (на случай если DOMContentLoaded уже произошел)
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('📄 Страница уже загружена, инициализация...');
    setTimeout(() => initAttempts(), 100);
}
