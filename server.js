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
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// ============================================================
// VARIÁVEIS DE CONTROLE
// ============================================================
let simuladorProcess = null;
let simuladorAtivo = false;
let pisadasTotal = 0;
let logLines = [];

// ============================================================
// FUNÇÃO: Iniciar simulador bash em background
// ============================================================
function iniciarSimulador() {
    if (simuladorProcess) {
        console.log('⚠️ Simulador já está rodando');
        return;
    }

    const scriptPath = path.join(__dirname, 'esp32_simulator_bg.sh');
    
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

    console.log('🚀 Iniciando simulador bash em background...');
    simuladorAtivo = true;

    simuladorProcess = spawn('bash', [scriptPath], {
        cwd: __dirname,
        detached: false
    });

    simuladorProcess.stdout.on('data', (data) => {
        const line = data.toString().trim();
        if (line) {
            console.log(`📊 ${line}`);
            logLines.push(`[${new Date().toLocaleTimeString()}] ${line}`);
            if (logLines.length > 100) logLines.shift();
        }
    });

    simuladorProcess.stderr.on('data', (data) => {
        const line = data.toString().trim();
        if (line) {
            console.error(`❌ ${line}`);
            logLines.push(`[${new Date().toLocaleTimeString()}] ❌ ${line}`);
            if (logLines.length > 100) logLines.shift();
        }
    });

    simuladorProcess.on('close', (code) => {
        console.log(`⚠️ Simulador encerrado com código ${code}`);
        simuladorProcess = null;
        simuladorAtivo = false;
        // Reiniciar automaticamente após 5 segundos
        setTimeout(() => {
            if (!simuladorProcess) {
                console.log('🔄 Reiniciando simulador...');
                iniciarSimulador();
            }
        }, 5000);
    });

    simuladorProcess.on('error', (err) => {
        console.error('❌ Erro no simulador:', err);
        simuladorProcess = null;
        simuladorAtivo = false;
    });

    console.log(`✅ Simulador iniciado (PID: ${simuladorProcess.pid})`);
}

// ============================================================
// FUNÇÃO: Parar simulador
// ============================================================
function pararSimulador() {
    if (simuladorProcess) {
        console.log('🛑 Parando simulador...');
        simuladorProcess.kill('SIGTERM');
        simuladorProcess = null;
        simuladorAtivo = false;
        console.log('✅ Simulador parado');
        return true;
    }
    return false;
}

// ============================================================
// ROTAS DA API
// ============================================================

// Status do simulador
app.get('/api/simulador/status', (req, res) => {
    res.json({
        ativo: simuladorAtivo,
        pid: simuladorProcess ? simuladorProcess.pid : null,
        pisadas_total: pisadasTotal,
        logs: logLines.slice(-20)
    });
});

// Iniciar simulador
app.post('/api/simulador/start', (req, res) => {
    if (simuladorProcess) {
        return res.json({ status: 'already_running', message: 'Simulador já está rodando' });
    }
    iniciarSimulador();
    res.json({ status: 'started', message: 'Simulador iniciado' });
});

// Parar simulador
app.post('/api/simulador/stop', (req, res) => {
    const result = pararSimulador();
    res.json({ 
        status: result ? 'stopped' : 'not_running',
        message: result ? 'Simulador parado' : 'Simulador não estava rodando'
    });
});

// Simular pisada (via API)
app.post('/api/simulador/pisada', (req, res) => {
    pisadasTotal++;
    // Enviar para VPS via proxy
    const data = {
        contador_pisadas: pisadasTotal,
        pisadas_por_minuto: Math.floor(Math.random() * 10) + 1
    };
    
    // Enviar para a VPS
    fetch('http://157.250.207.166:82/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(() => {
        logLines.push(`[${new Date().toLocaleTimeString()}] 👣 Pisada #${pisadasTotal} enviada`);
        res.json({ status: 'success', pisada: pisadasTotal });
    })
    .catch(error => {
        logLines.push(`[${new Date().toLocaleTimeString()}] ❌ Erro ao enviar pisada: ${error.message}`);
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
            ativo: simuladorAtivo,
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
    console.log('║   🚀 PGE SIMULADOR - PAINEL + BASH                     ║');
    console.log('║   Render.com - Proxy para VPS                          ║');
    console.log('║                                                          ║');
    console.log(`║   📡 Servidor rodando na porta: ${PORT}                 ║`);
    console.log('║   🔗 Proxy: http://157.250.207.166:82                  ║');
    console.log('║                                                          ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('✅ Servidor pronto!');
    console.log('🔧 Proxy ativo para /api → http://157.250.207.166:82');
    console.log('');
    console.log('⏳ Iniciando simulador bash em background...');
    
    // Iniciar simulador automaticamente após 2 segundos
    setTimeout(iniciarSimulador, 2000);
});

// ============================================================
// TRATAMENTO DE ENCERRAMENTO
// ============================================================
process.on('SIGINT', () => {
    console.log('🛑 Encerrando servidor...');
    pararSimulador();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🛑 Encerrando servidor...');
    pararSimulador();
    process.exit(0);
});

process.on('uncaughtException', (err) => {
    console.error('❌ Erro não tratado:', err);
});

process.on('unhandledRejection', (err) => {
    console.error('❌ Promessa rejeitada:', err);
});

module.exports = app;