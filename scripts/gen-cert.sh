#!/usr/bin/env bash
set -euo pipefail

IP="${PI_IP:-${1:-}}"
if [ -z "$IP" ]; then
  echo "Usage: PI_IP=192.168.1.25 npm run gen-cert   (or: npm run gen-cert -- 192.168.1.25)" >&2
  exit 1
fi
DIR="$(cd "$(dirname "$0")/.." && pwd)/certs"

mkdir -p "$DIR"

openssl req -x509 -newkey rsa:2048 -sha256 -days 825 -nodes \
  -keyout "$DIR/key.pem" -out "$DIR/cert.pem" \
  -subj "/CN=Medibot PX" \
  -addext "subjectAltName=IP:$IP,DNS:localhost"

echo "Certificates written to $DIR (IP: $IP, localhost)"
echo "Open https://$IP:3000 on the tablet and accept the certificate warning once."
