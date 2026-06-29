#!/bin/bash

# ============================================================
# SIMULADOR ESP32 - RODA NO RENDER
# ============================================================

VPS_IP="157.250.207.166"
VPS_PORT="82"
API_BASE="http://${VPS_IP}:${VPS_PORT}/api"

# Arquivo de controle
CONTROL_FILE="/tmp/simulador_control.txt"
PID_FILE="/tmp/simulador.pid"

# Estados dos relés
RELE_USB=true
RELE_TOMADAS=true
RELE_LUZES=false
PISADAS_TOTAL=1234
ENERGIA=0.5234
COUNT=0

# Função para verificar se o auto elétrico está ativo
is_auto_eletrico_ativo() {
    if [ -f "$CONTROL_FILE" ]; then
        local status=$(cat "$CONTROL_FILE")
        if [ "$status" = "ativo" ]; then
            return 0
        fi
    fi
    return 1
}

echo "🚀 Simulador ESP32 iniciado"
echo "📡 Enviando para: ${API_BASE}"
echo "📁 Arquivo de controle: ${CONTROL_FILE}"
echo ""

# Criar arquivo de controle
echo "desligado" > "$CONTROL_FILE"

# Loop principal
while true; do
    # Verificar se o auto elétrico está ativo
    if is_auto_eletrico_ativo; then
        COUNT=$((COUNT + 1))
        
        # Gerar valores variáveis
        CORRENTE=$((2 + COUNT % 14))
        TENSAO=$((215 + COUNT % 20))
        POTENCIA=$((CORRENTE * TENSAO))
        BATERIA=$((75 + COUNT % 25))
        TEMPERATURA=$((22 + COUNT % 13))
        LUMINOSIDADE=$((30 + COUNT % 70))
        PISADAS_MINUTO=$((COUNT % 12))
        PISADAS_TOTAL=$((PISADAS_TOTAL + PISADAS_MINUTO))
        ENERGIA=$(echo "$ENERGIA + 0.01" | bc 2>/dev/null || echo "0.5432")
        HORA=$(date +%H | sed 's/^0//')
        MINUTO=$(date +%M | sed 's/^0//')
        
        echo "[$COUNT] ⚡ ${CORRENTE}A | ${TENSAO}V | ${POTENCIA}W"
        
        # Construir JSON
        JSON="{\"corrente\":${CORRENTE},\"tensao\":${TENSAO},\"potencia\":${POTENCIA},\"energia_diaria\":${ENERGIA},\"bateria_soc\":${BATERIA},\"temperatura\":${TEMPERATURA},\"contador_pisadas\":${PISADAS_TOTAL},\"modo_operacao\":\"NORMAL\",\"rele_usb\":${RELE_USB},\"rele_tomadas\":${RELE_TOMADAS},\"rele_luzes\":${RELE_LUZES},\"luminosidade\":${LUMINOSIDADE},\"hora\":${HORA},\"minuto\":${MINUTO},\"pisadas_por_minuto\":${PISADAS_MINUTO},\"calibracao\":true}"
        
        # Enviar para VPS
        curl -s -X POST "${API_BASE}/data" -H "Content-Type: application/json" -d "$JSON" > /dev/null
        
        echo "✅ Enviado!"
    else
        # Se estiver desligado, espera sem fazer nada
        sleep 1
        continue
    fi
    
    sleep 3
done