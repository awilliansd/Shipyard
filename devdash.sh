#!/bin/bash
cd "C:/Code/devdash"
start "" "http://localhost:5421" 2>/dev/null &
pnpm dev
