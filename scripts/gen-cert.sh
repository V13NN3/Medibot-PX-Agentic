#!/usr/bin/env bash
set -euo pipefail

IP="${1:-192.168.1.25}"
DIR="$(cd "$(dirname "$0")/.." && pwd)/certs"

mkdir -p "$DIR"

openssl req -x509 -newkey rsa:2048 -sha256 -days 825 -nodes \
  -keyout "$DIR/key.pem" -out "$DIR/cert.pem" \
  -subj "/CN=Medibot PX" \
  -addext "subjectAltName=IP:$IP,DNS:localhost"

echo "Certificates written to $DIR (IP: $IP, localhost)"
echo "Open https://$IP:3000 on the tablet and accept the certificate warning once."
