const express = require('express');
const cors = require('cors');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

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
// PROXY PARA A VPS
// ============================================================
const VPS_IP = '157.250.207.166';
const VPS_PORT = '82';

app.use('/api', createProxyMiddleware({
    target: `http://${VPS_IP}:${VPS_PORT}`,
    changeOrigin: true,
    pathRewrite: {
        '^/api': '/api'
    },
    onProxyReq: (proxyReq, req, res) => {
        console.log(`🔄 Proxy: ${req.method} ${req.url}`);
    },
    onProxyRes: (proxyRes, req, res) => {
        console.log(`✅ Proxy resposta: ${proxyRes.statusCode}`);
    },
    onError: (err, req, res) => {
        console.error(`❌ Proxy erro: ${err.message}`);
        res.status(500).json({ 
            status: 'error', 
            message: 'Erro ao conectar à VPS'
        });
    }
}));

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
        uptime: process.uptime()
    });
});

// ============================================================
// INICIAR SERVIDOR
// ============================================================
app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║                                                          ║');
    console.log('║   🚀 PGE SIMULADOR - PAINEL DE CONTROLE                ║');
    console.log('║                                                          ║');
    console.log(`║   📡 Servidor rodando na porta: ${PORT}                 ║`);
    console.log(`║   🔗 Proxy: http://${VPS_IP}:${VPS_PORT}               ║`);
    console.log('║                                                          ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('✅ Servidor pronto!');
    console.log('👣 Pisadas: MANUAIS (clique no botão)');
    console.log('⚡ Auto Elétrico: controlado por botão');
});

// ============================================================
// TRATAMENTO DE ERROS
// ============================================================
process.on('uncaughtException', (err) => {
    console.error('❌ Erro não tratado:', err);
});

process.on('unhandledRejection', (err) => {
    console.error('❌ Promessa rejeitada:', err);
});

module.exports = app;