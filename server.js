const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'simulador_esp32.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Simulador rodando na porta ${PORT}`);
});