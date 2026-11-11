#!/usr/bin/env bash
# Genera index.html (página completa) a partir de propuesta.html (contenido).
cd "$(dirname "$0")"
{
  printf '<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<style>body{margin:0}img{max-width:100%%}[hidden]{display:none!important}</style>\n</head>\n<body>\n'
  cat propuesta.html
  printf '</body>\n</html>\n'
} > index.html
