// CONFIGURAÇÃO FIREBASE (Atualizada!)
const firebaseConfig = {
    apiKey: "AIzaSyBb2-KPcHTvrfKXKIKCMgBA8XGWQ_V0wyw",
    authDomain: "baile-b3e5a.firebaseapp.com",
    projectId: "baile-b3e5a",
    storageBucket: "baile-b3e5a.firebasestorage.app",
    messagingSenderId: "297888295333",
    appId: "1:297888295333:web:4f2fc0fd7b7202d34de04c",
    databaseURL: "https://baile-b3e5a-default-rtdb.firebaseio.com" // URL padrão do Firebase
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const JURY_PASSWORD = "OURO";
const ADMIN_PASSWORD = "GALA";

let state = {
    masks: [],
    voters: [],
    isJuryLoggedIn: false,
    isAdminLoggedIn: false
};

// Inicialização
function init() {
    setupEventListeners();
    listenToData();
}

// Escuta a base de dados em TEMPO REAL para todos
function listenToData() {
    // Escutar Máscaras
    db.ref('masks').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            state.masks = Object.values(data);
            renderVotingGrid();
            renderResults();
            if (state.isJuryLoggedIn) renderJuryPanel();
            if (state.isAdminLoggedIn) renderAdminPanel();
        } else {
            // Se a BD estiver vazia, inicializar com as padrão
            initializeDatabase();
        }
    });

    // Escutar Votantes
    db.ref('voters').on('value', (snapshot) => {
        const data = snapshot.val();
        state.voters = data ? Object.values(data) : [];
    });
}

function initializeDatabase() {
    const initialMasks = [
        { id: 1, name: "Aureum Venetian", description: "Ouro e seda roxa com detalhes ornamentais.", image: "mask1.png", votes: 0, juryScore: 0 },
        { id: 2, name: "Emeralda Royal", description: "Filigrana de prata com esmeraldas imperiais.", image: "mask2.png", votes: 0, juryScore: 0 },
        { id: 3, name: "Midnight Celeuste", description: "Veludo azul profundo com cristais estelares.", image: "mask3.png", votes: 0, juryScore: 0 },
        { id: 4, name: "Ruby Empress", description: "Bronze e rubi com design de coroa clássico.", image: "mask4.png", votes: 0, juryScore: 0 }
    ];

    initialMasks.forEach(m => {
        db.ref('masks/' + m.id).set(m);
    });
}

// Atualizar apenas o necessário (saveData já não é global)
function updateMaskInDB(maskId, data) {
    db.ref('masks/' + maskId).update(data);
}

// Event Listeners
function setupEventListeners() {
    // Nav Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            showSection(target);

            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (target === 'results-section') renderResults();
            if (target === 'jury-section' && state.isJuryLoggedIn) renderJuryPanel();
            if (target === 'admin-section' && state.isAdminLoggedIn) renderAdminPanel();
        });
    });

    // Admin Login
    document.getElementById('admin-login-btn').addEventListener('click', handleAdminLogin);
    document.getElementById('admin-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAdminLogin();
    });

    // Admin Logout
    document.getElementById('admin-logout-btn').addEventListener('click', () => {
        state.isAdminLoggedIn = false;
        document.getElementById('admin-panel').style.display = 'none';
        document.getElementById('admin-login').style.display = 'block';
        document.getElementById('admin-password').value = '';
    });

    // Add Mask
    document.getElementById('add-mask-btn').addEventListener('click', handleAddMask);

    // Reset Database
    document.getElementById('reset-db-btn').addEventListener('click', handleResetDatabase);

    // Jury Login
    document.getElementById('login-btn').addEventListener('click', handleLogin);
    document.getElementById('jury-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    // Submit Vote
    document.getElementById('submit-vote-btn').addEventListener('click', handleVoteSubmission);

    // Jury Logout
    document.getElementById('logout-btn').addEventListener('click', () => {
        state.isJuryLoggedIn = false;
        document.getElementById('jury-panel').style.display = 'none';
        document.getElementById('jury-login').style.display = 'block';
        document.getElementById('jury-password').value = '';
    });
}

function showSection(id) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

// Votação Pública
function renderVotingGrid() {
    const grid = document.getElementById('masks-grid');
    grid.innerHTML = '';

    state.masks.forEach(mask => {
        const card = document.createElement('div');
        card.className = 'mask-card';
        card.innerHTML = `
            <div class="mask-badge">${mask.id}</div>
            <div class="mask-image-wrapper">
                <img src="${mask.image}" alt="${mask.name}">
            </div>
            <div class="mask-info">
                <h3>${mask.name}</h3>
                <p>${mask.description}</p>
                <button class="secondary-btn select-mask-btn" data-id="${mask.id}">Selecionar esta Máscara</button>
            </div>
        `;
        grid.appendChild(card);
    });

    document.querySelectorAll('.select-mask-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            document.getElementById('target-mask-id').value = id;
            document.getElementById('target-mask-id').focus();
        });
    });
}

function handleVoteSubmission() {
    const voterIdInput = document.getElementById('voter-id');
    const targetIdInput = document.getElementById('target-mask-id');
    const errorEl = document.getElementById('vote-error');

    const voterId = parseInt(voterIdInput.value);
    const targetId = parseInt(targetIdInput.value);

    // Reset error
    errorEl.style.display = 'none';

    if (isNaN(voterId) || isNaN(targetId)) {
        showError("Por favor, preencha ambos os números.");
        return;
    }

    if (voterId === targetId) {
        showError("Não pode votar na sua própria máscara!");
        return;
    }

    if (state.voters.includes(voterId)) {
        showError("Este número de participante já votou!");
        return;
    }

    const mask = state.masks.find(m => m.id === targetId);
    if (!mask) {
        showError("Número de máscara inválido.");
        return;
    }

    // Sucesso
    db.ref('masks/' + targetId + '/votes').transaction((currentVotes) => (currentVotes || 0) + 1);
    db.ref('voters').push(voterId);

    voterIdInput.value = '';
    targetIdInput.value = '';

    showToast(`Voto de #${voterId} registado para ${mask.name}!`);
}

function showError(msg) {
    const errorEl = document.getElementById('vote-error');
    errorEl.innerText = msg;
    errorEl.style.display = 'block';
}

function checkVoteStatus() {
    // We don't disable all buttons anymore because multiple people might use the same device
    // But we can show a confirmation or refresh results if we want.
}

// Painel do Júri
function handleLogin() {
    const pass = document.getElementById('jury-password').value;
    const errorEl = document.getElementById('login-error');

    if (pass === JURY_PASSWORD) {
        state.isJuryLoggedIn = true;
        document.getElementById('jury-login').style.display = 'none';
        document.getElementById('jury-panel').style.display = 'block';
        errorEl.style.display = 'none';
        renderJuryPanel();
    } else {
        errorEl.style.display = 'block';
    }
}

function renderJuryPanel() {
    const grid = document.getElementById('jury-grid');
    grid.innerHTML = '';

    state.masks.forEach(mask => {
        const card = document.createElement('div');
        card.className = 'mask-card';
        card.innerHTML = `
            <div class="mask-image-wrapper">
                <img src="${mask.image}" alt="${mask.name}">
            </div>
            <div class="mask-info">
                <h3>${mask.name}</h3>
                <div class="rating-control">
                    <div class="rating-header">
                        <span>Nota:</span>
                        <span id="label-score-${mask.id}" class="gold-text"><strong>${mask.juryScore.toFixed(1)}</strong></span>
                    </div>
                    <input type="range" min="0" max="10" step="0.5" value="${mask.juryScore}" 
                           class="jury-range" id="range-${mask.id}" data-id="${mask.id}">
                    <button class="primary-btn confirm-score-btn" data-id="${mask.id}">Confirmar Nota</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });

    // Listener for slider label update
    document.querySelectorAll('.jury-range').forEach(range => {
        range.addEventListener('input', (e) => {
            const id = parseInt(e.target.dataset.id);
            const val = parseFloat(e.target.value);
            document.getElementById(`label-score-${id}`).innerHTML = `<strong>${val.toFixed(1)}</strong>`;
        });
    });

    // Listener for confirm button
    document.querySelectorAll('.confirm-score-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.target.dataset.id);
            const val = parseFloat(document.getElementById(`range-${id}`).value);

            updateMaskInDB(id, { juryScore: val });
            showToast(`Nota ${val.toFixed(1)} confirmada!`);
        });
    });
}

// Admin Panel
function handleAdminLogin() {
    const pass = document.getElementById('admin-password').value;
    const errorEl = document.getElementById('admin-login-error');

    if (pass === ADMIN_PASSWORD) {
        state.isAdminLoggedIn = true;
        document.getElementById('admin-login').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'block';
        errorEl.style.display = 'none';
        renderAdminPanel();
    } else {
        errorEl.style.display = 'block';
    }
}

function renderAdminPanel() {
    const list = document.getElementById('admin-masks-list');
    list.innerHTML = '<h3>Máscaras Atuais</h3>';

    state.masks.forEach(mask => {
        const item = document.createElement('div');
        item.className = 'admin-mask-item';
        item.innerHTML = `
            <img src="${mask.image}" alt="${mask.name}" onerror="this.src='https://via.placeholder.com/60?text=No+Img'">
            <div class="admin-mask-item-info">
                <strong>#${mask.id} - ${mask.name}</strong>
                <p>${mask.description}</p>
            </div>
            <button class="secondary-btn delete-mask-btn" data-id="${mask.id}" style="color: #ff4d4d; border-color: #ff4d4d;">Eliminar</button>
        `;
        list.appendChild(item);
    });

    document.querySelectorAll('.delete-mask-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.target.dataset.id);
            if (confirm(`Tem a certeza que deseja eliminar a máscara #${id}?`)) {
                db.ref('masks/' + id).remove();
            }
        });
    });
}

function handleAddMask() {
    const id = parseInt(document.getElementById('new-mask-id').value);
    const name = document.getElementById('new-mask-name').value;
    const desc = document.getElementById('new-mask-desc').value;
    const img = document.getElementById('new-mask-img').value;

    if (!id || !name) {
        alert("O número e o nome são obrigatórios.");
        return;
    }

    if (state.masks.some(m => m.id === id)) {
        alert("Já existe uma máscara com este número.");
        return;
    }

    const newMask = {
        id: id,
        name: name,
        description: desc || "Sem descrição",
        image: img || "https://via.placeholder.com/400x400?text=Máscara",
        votes: 0,
        juryScore: 0
    };

    db.ref('masks/' + id).set(newMask);

    // Clear inputs
    document.getElementById('new-mask-id').value = '';
    document.getElementById('new-mask-name').value = '';
    document.getElementById('new-mask-desc').value = '';
    document.getElementById('new-mask-img').value = '';

    showToast("Nova máscara adicionada com sucesso!");
}

function handleResetDatabase() {
    if (!confirm("⚠️ ATENÇÃO: Isto vai apagar TODOS os votos, todos os votantes e todas as notas do júri. Deseja continuar?")) {
        return;
    }

    // 1. Limpar lista de votantes
    db.ref('voters').remove();

    // 2. Resetar votos e notas em cada máscara
    state.masks.forEach(mask => {
        db.ref('masks/' + mask.id).update({
            votes: 0,
            juryScore: 0
        });
    });

    showToast("Base de dados limpa com sucesso! 🧹");
}

// Resultados
function renderResults() {
    const container = document.getElementById('leaderboard');
    container.innerHTML = '';

    const totalVotes = state.masks.reduce((sum, m) => sum + m.votes, 0);
    const maxVotes = Math.max(...state.masks.map(m => m.votes), 1);

    const masksWithScores = state.masks.map(mask => {
        // Normalizar votos para uma escala de 0 a 10
        // Se usarmos a percentagem do total: (mask.votes / totalVotes) * 10
        // Se usarmos relativo ao mais votado: (mask.votes / maxVotes) * 10
        // Vamos usar relativo ao mais votado para ser mais justo competitivamente
        const publicScore = (mask.votes / maxVotes) * 10;
        const finalScore = (publicScore * 0.5) + (mask.juryScore * 0.5);

        return { ...mask, publicScore, finalScore };
    });

    const sorted = masksWithScores.sort((a, b) => b.finalScore - a.finalScore);

    sorted.forEach((mask, index) => {
        const item = document.createElement('div');
        item.className = 'ranking-item';
        item.innerHTML = `
            <div class="rank-number">#${index + 1}</div>
            <img src="${mask.image}" class="rank-img" alt="${mask.name}" onerror="this.src='https://via.placeholder.com/80?text=No+Img'">
            <div class="rank-details">
                <h4>${mask.name}</h4>
                <div class="score-pills">
                    <span class="pill votes">${mask.votes} Votos (${mask.publicScore.toFixed(1)} pts)</span>
                    <span class="pill jury">Júri: ${mask.juryScore.toFixed(1)} pts</span>
                </div>
            </div>
            <div class="total-score">
                <label>Total (50/50)</label>
                <div class="value">${mask.finalScore.toFixed(1)}</div>
            </div>
        `;
        container.appendChild(item);
    });
}

// Toast Notification
function showToast(msg) {
    const area = document.getElementById('notification-area');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = msg;
    area.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// Iniciar App
window.addEventListener('DOMContentLoaded', init);
