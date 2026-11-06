#!/usr/bin/env bash
# Ejecuta el análisis SonarQube (imagen Docker oficial del scanner)
#
# Requisitos:
#   docker run -d --name sonarqube-local -p 9000:9000 sonarqube:community
#   (o: docker compose -f docker-compose.sonar.yml up -d)
#
# Uso:
#   bash sonar-scan.sh
set -euo pipefail

cd "$(dirname "$0")"

SCANNER_IMAGE="${SCANNER_IMAGE:-sonarsource/sonar-scanner-cli:latest}"

# Token: se crea una sola vez y se reutiliza
SONAR_TOKEN_FILE="$PWD/.sonar-token"
if [ ! -f "$SONAR_TOKEN_FILE" ]; then
  echo ">> Creando token de usuario en SonarQube..."
  TOKEN=$(curl -s -u admin:admin -X POST "http://localhost:9000/api/user_tokens/generate" \
    -d "name=scan-local-$(date +%s)&type=USER_TOKEN" | python3 -c "import json,sys; print(json.load(sys.stdin)['token'])")
  echo "$TOKEN" > "$SONAR_TOKEN_FILE"
fi
SONAR_TOKEN=$(cat "$SONAR_TOKEN_FILE")

# La URL del servidor: el scanner corre dentro de un contenedor, donde
# 'localhost' NO es el host. Si SonarQube corre como contenedor
# 'sonarqube-local', usamos su IP; si corre en el host, localhost sí sirve.
if [ -z "${SONAR_HOST_URL:-}" ]; then
  if docker inspect sonarqube-local >/dev/null 2>&1; then
    CONTAINER_IP=$(docker inspect -f '{{json .NetworkSettings}}' sonarqube-local \
      | python3 -c "import json,sys; ns=json.load(sys.stdin); print(next(iter(ns['Networks'].values()))['IPAddress'])")
    SONAR_HOST_URL="http://$CONTAINER_IP:9000"
    echo ">> Usando IP del contenedor: $SONAR_HOST_URL"
  else
    SONAR_HOST_URL="http://localhost:9000"
  fi
fi

echo ">> Ejecutando análisis (backend, frontend, interlockerup-admin)..."
docker run --rm \
  -v "$PWD:/home/sonarqube" \
  -w /home/sonarqube \
  "$SCANNER_IMAGE" \
  -Dsonar.host.url="$SONAR_HOST_URL" \
  -Dsonar.token="$SONAR_TOKEN"

echo ">> Análisis completado. Resultados en: $SONAR_HOST_URL/dashboard?id=interlockerup"
