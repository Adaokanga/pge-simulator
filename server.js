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
        console.log(`🔄 Proxy: ${req.method} ${req.url} → ${VPS_IP}:${VPS_PORT}`);
    },
    onProxyRes: (proxyRes, req, res) => {
        console.log(`✅ Proxy resposta: ${proxyRes.statusCode}`);
    },
    onError: (err, req, res) => {
        console.error(`❌ Proxy erro: ${err.message}`);
        res.status(500).json({ 
            status: 'error', 
            message: 'Erro ao conectar à VPS',
            details: err.message
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
        uptime: process.uptime(),
        vps: `http://${VPS_IP}:${VPS_PORT}`
    });
});

// ============================================================
// FALLBACK - Se o arquivo não for encontrado
// ============================================================
app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
        // Já foi tratado pelo proxy
        return;
    }
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ============================================================
// INICIAR SERVIDOR
// ============================================================
app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║                                                          ║');
    console.log('║   🚀 SIMULADOR ESP32 - PGE                             ║');
    console.log('║   Render.com - Proxy para VPS                          ║');
    console.log('║                                                          ║');
    console.log(`║   📡 Servidor rodando na porta: ${PORT}                 ║`);
    console.log(`║   🔗 Proxy: http://${VPS_IP}:${VPS_PORT}               ║`);
    console.log('║                                                          ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('✅ Servidor pronto para receber conexões!');
    console.log('🔧 Proxy ativo para /api → http://' + VPS_IP + ':' + VPS_PORT);
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