const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { exec, spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================
// VARIÁVEIS
// ============================================================
const CONTROL_FILE = '/tmp/simulador_control.txt';
let simuladorProcess = null;
let pisadasTotal = 0;

// ============================================================
// FUNÇÕES DE CONTROLE DO BASH
// ============================================================

// Iniciar simulador bash em background
function iniciarSimulador() {
    if (simuladorProcess) {
        console.log('⚠️ Simulador já está rodando');
        return;
    }

    const scriptPath = path.join(__dirname, 'esp32_simulator.sh');
    
    if (!fs.existsSync(scriptPath)) {
        console.error('❌ Script não encontrado:', scriptPath);
        return;
    }

    // Tornar executável
    try {
        fs.chmodSync(scriptPath, '755');
    } catch (err) {
        console.error('❌ Erro ao tornar executável:', err);
    }

    console.log('🚀 Iniciando simulador bash...');

    simuladorProcess = spawn('bash', [scriptPath], {
        cwd: __dirname,
        detached: false
    });

    simuladorProcess.stdout.on('data', (data) => {
        console.log(`📊 ${data.toString().trim()}`);
    });

    simuladorProcess.stderr.on('data', (data) => {
        console.error(`❌ ${data.toString().trim()}`);
    });

    simuladorProcess.on('close', (code) => {
        console.log(`⚠️ Simulador encerrado com código ${code}`);
        simuladorProcess = null;
        // Reiniciar automaticamente
        setTimeout(() => {
            if (!simuladorProcess) {
                console.log('🔄 Reiniciando simulador...');
                iniciarSimulador();
            }
        }, 5000);
    });

    console.log(`✅ Simulador iniciado (PID: ${simuladorProcess.pid})`);
}

// Função para controlar o auto elétrico via arquivo
function setAutoEletrico(ativo) {
    const status = ativo ? 'ativo' : 'desligado';
    fs.writeFileSync(CONTROL_FILE, status);
    console.log(`📝 Auto Elétrico: ${status}`);
}

// Função para verificar status do auto elétrico
function getAutoEletricoStatus() {
    try {
        if (fs.existsSync(CONTROL_FILE)) {
            const status = fs.readFileSync(CONTROL_FILE, 'utf8').trim();
            return status === 'ativo';
        }
    } catch (err) {
        console.error('Erro ao ler status:', err);
    }
    return false;
}

// ============================================================
// ROTAS DA API
// ============================================================

// Status do simulador
app.get('/api/simulador/status', (req, res) => {
    const autoEletrico = getAutoEletricoStatus();
    res.json({
        auto_eletrico: autoEletrico,
        pisadas_total: pisadasTotal,
        pid: simuladorProcess ? simuladorProcess.pid : null
    });
});

// Ligar/Desligar Auto Elétrico
app.post('/api/simulador/auto', (req, res) => {
    const { ativo } = req.body;
    setAutoEletrico(ativo);
    res.json({ 
        status: 'success', 
        auto_eletrico: ativo 
    });
});

// Simular pisada
app.post('/api/simulador/pisada', (req, res) => {
    pisadasTotal++;
    
    // Enviar para VPS
    const data = {
        contador_pisadas: pisadasTotal,
        pisadas_por_minuto: Math.floor(Math.random() * 10) + 1
    };
    
    fetch('http://157.250.207.166:82/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(() => {
        res.json({ status: 'success', pisada: pisadasTotal });
    })
    .catch(error => {
        console.error('Erro ao enviar pisada:', error);
        res.status(500).json({ status: 'error', message: error.message });
    });
});

// ============================================================
// ROTA PRINCIPAL
// ============================================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        simulador: {
            auto_eletrico: getAutoEletricoStatus(),
            pid: simuladorProcess ? simuladorProcess.pid : null
        }
    });
});

// ============================================================
// INICIAR SERVIDOR
// ============================================================
app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║                                                          ║');
    console.log('║   🚀 PGE SIMULADOR - BASH + PAINEL                    ║');
    console.log('║                                                          ║');
    console.log(`║   📡 Servidor rodando na porta: ${PORT}                 ║`);
    console.log('║   🔗 Proxy: http://157.250.207.166:82                  ║');
    console.log('║                                                          ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('✅ Servidor pronto!');
    console.log('⏳ Iniciando simulador bash...');
    
    // Iniciar simulador
    setTimeout(iniciarSimulador, 2000);
});

// ============================================================
// TRATAMENTO DE ENCERRAMENTO
// ============================================================
process.on('SIGINT', () => {
    console.log('🛑 Encerrando servidor...');
    if (simuladorProcess) {
        simuladorProcess.kill('SIGTERM');
    }
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🛑 Encerrando servidor...');
    if (simuladorProcess) {
        simuladorProcess.kill('SIGTERM');
    }
    process.exit(0);
});

module.exports = app;